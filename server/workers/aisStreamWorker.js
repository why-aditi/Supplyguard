/**
 * AISstream.io — Real-time Vessel Tracking Worker
 * 
 * Connects to AISstream's WebSocket API and monitors vessel positions
 * near key ports in the supply chain graph. Detects anomalies like:
 *   - Unusual vessel clustering (port congestion)
 *   - Vessels stopped/anchored at chokepoints (delays)
 *   - Deviation from expected routes
 * 
 * Free tier — no rate limits, just needs an API key from aisstream.io
 */

import WebSocket from 'ws';

// Port bounding boxes — monitor key ports from the supply chain graph
// Format: [[min_lat, min_lng], [max_lat, max_lng]]
// Tighter bounding boxes focused on anchorage/terminal areas (not entire waterways)
const PORT_ZONES = {
  'port-shanghai':   { box: [[31.0, 121.6], [31.5, 122.1]],  name: 'Shanghai' },
  'port-shenzhen':   { box: [[22.3, 113.8], [22.6, 114.1]],  name: 'Shenzhen' },
  'port-singapore':  { box: [[1.14, 103.7], [1.35, 104.0]],  name: 'Singapore' },
  'port-rotterdam':  { box: [[51.85, 3.9], [51.98, 4.5]],    name: 'Rotterdam' },
  'port-la':         { box: [[33.7, -118.3], [33.8, -118.15]],name: 'Los Angeles' },
  'port-hamburg':    { box: [[53.5, 9.8], [53.55, 10.05]],   name: 'Hamburg' },
  'port-busan':      { box: [[35.0, 128.9], [35.15, 129.1]],  name: 'Busan' },
  'port-dubai':      { box: [[24.95, 55.0], [25.1, 55.15]],  name: 'Jebel Ali' },
  'port-mumbai':     { box: [[18.9, 72.85], [19.0, 72.95]],  name: 'Mumbai (JNPT)' },
  'hub-suez':        { box: [[30.3, 32.25], [30.6, 32.45]],  name: 'Suez Canal' },
  'hub-malacca':     { box: [[2.0, 101.5], [2.5, 102.5]],    name: 'Strait of Malacca' },
  'hub-panama':      { box: [[8.9, -79.7], [9.1, -79.5]],    name: 'Panama Canal' },
};

// Congestion detection thresholds
const CONGESTION_WINDOW_MS = 10 * 60 * 1000;    // 10-minute sliding window
const CONGESTION_VESSEL_THRESHOLD = 50;           // 50+ anchored vessels = real congestion
const SLOW_SPEED_KN = 0.5;                        // knots — truly stationary/anchored

export class AISStreamWorker {
  constructor({ apiKey, onDisruption, onVesselUpdate }) {
    this.apiKey = apiKey;
    this.onDisruption = onDisruption;       // callback: (disruption) => void
    this.onVesselUpdate = onVesselUpdate;   // callback: (update) => void
    this.ws = null;
    this.reconnectTimer = null;
    this.connected = false;

    // Per-zone tracking for congestion detection
    this.zoneVessels = {};
    for (const zoneId of Object.keys(PORT_ZONES)) {
      this.zoneVessels[zoneId] = new Map(); // mmsi -> { timestamp, speed, lat, lng }
    }

    // Dedup — don't fire the same congestion alert within 30 min
    this.lastAlerts = new Map(); // zoneId -> lastAlertTimestamp
  }

  start() {
    if (!this.apiKey) {
      console.log('⚠️  AISSTREAM_API_KEY not set — AIS tracking disabled');
      return;
    }
    console.log('🚢 AISstream worker starting...');
    this._connect();

    // Run congestion checks every 60 seconds
    this.congestionInterval = setInterval(() => this._checkCongestion(), 60_000);
  }

  stop() {
    clearInterval(this.congestionInterval);
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('🚢 AISstream worker stopped');
  }

  _connect() {
    const url = 'wss://stream.aisstream.io/v0/stream';
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.connected = true;
      console.log('🚢 AISstream WebSocket connected');

      // Subscribe — must send within 3 seconds of connection
      const allBoxes = Object.values(PORT_ZONES).map((z) => z.box);
      const subscription = {
        Apikey: this.apiKey,
        BoundingBoxes: allBoxes,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };

      this.ws.send(JSON.stringify(subscription));
      console.log(`🚢 Subscribed to ${allBoxes.length} port zones`);
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this._handleMessage(msg);
      } catch (err) {
        // Ignore parse errors on malformed messages
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      console.log('🚢 AISstream disconnected — reconnecting in 10s...');
      this.reconnectTimer = setTimeout(() => this._connect(), 10_000);
    });

    this.ws.on('error', (err) => {
      console.error('🚢 AISstream error:', err.message);
      this.ws.close();
    });
  }

  _handleMessage(msg) {
    const type = msg.MessageType;

    if (type === 'PositionReport') {
      const report = msg.Message?.PositionReport;
      if (!report) return;

      const mmsi = msg.MetaData?.MMSI?.toString();
      const shipName = msg.MetaData?.ShipName?.trim() || `MMSI-${mmsi}`;
      const lat = report.Latitude;
      const lng = report.Longitude;
      const speed = report.Sog ?? 0;   // Speed over ground in knots
      const heading = report.TrueHeading ?? 0;
      const navStatus = report.NavigationalStatus ?? -1;

      if (!mmsi || lat === undefined || lng === undefined) return;

      // Identify which port zone this vessel is in
      for (const [zoneId, zone] of Object.entries(PORT_ZONES)) {
        const [[minLat, minLng], [maxLat, maxLng]] = zone.box;
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          // Track vessel in this zone
          this.zoneVessels[zoneId].set(mmsi, {
            mmsi,
            name: shipName,
            lat,
            lng,
            speed,
            heading,
            navStatus,
            timestamp: Date.now(),
          });

          // Emit vessel update for the frontend
          if (this.onVesselUpdate) {
            this.onVesselUpdate({
              zone_id: zoneId,
              zone_name: zone.name,
              mmsi,
              ship_name: shipName,
              lat,
              lng,
              speed,
              heading,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }
      }
    }
  }

  _checkCongestion() {
    const now = Date.now();

    for (const [zoneId, vessels] of Object.entries(this.zoneVessels)) {
      // Purge stale entries (older than the window)
      for (const [mmsi, data] of vessels) {
        if (now - data.timestamp > CONGESTION_WINDOW_MS) {
          vessels.delete(mmsi);
        }
      }

      // Count slow/anchored vessels
      const slowVessels = Array.from(vessels.values()).filter(
        (v) => v.speed < SLOW_SPEED_KN
      );

      if (slowVessels.length >= CONGESTION_VESSEL_THRESHOLD) {
        // Check dedup — don't repeat alerts within 30 min
        const lastAlert = this.lastAlerts.get(zoneId) || 0;
        if (now - lastAlert < 30 * 60 * 1000) continue;

        this.lastAlerts.set(zoneId, now);

        const zone = PORT_ZONES[zoneId];
        // Gradual severity: 50 vessels = 0.6, 100 = 0.75, 200+ = 0.95
        const severity = Math.min(0.95, 0.5 + (slowVessels.length / 200) * 0.45);

        console.log(
          `🚨 AIS congestion detected at ${zone.name}: ${slowVessels.length} vessels anchored/slow`
        );

        if (this.onDisruption) {
          this.onDisruption({
            source: 'aisstream',
            disruption_type: 'port_delay',
            severity: Math.round(severity * 100) / 100,
            location: zone.name,
            affected_node_id: zoneId,
            confidence: Math.min(0.95, 0.6 + slowVessels.length * 0.02),
            details: {
              anchored_vessels: slowVessels.length,
              total_vessels: vessels.size,
              sample_vessels: slowVessels.slice(0, 5).map((v) => ({
                name: v.name,
                mmsi: v.mmsi,
                speed: v.speed,
              })),
            },
          });
        }
      }
    }
  }

  /** Get current status for the /api/ais/status endpoint */
  getStatus() {
    const zones = {};
    for (const [zoneId, vessels] of Object.entries(this.zoneVessels)) {
      const zone = PORT_ZONES[zoneId];
      const active = Array.from(vessels.values()).filter(
        (v) => Date.now() - v.timestamp < CONGESTION_WINDOW_MS
      );
      zones[zoneId] = {
        name: zone.name,
        vessel_count: active.length,
        anchored_count: active.filter((v) => v.speed < SLOW_SPEED_KN).length,
      };
    }

    return {
      connected: this.connected,
      monitored_zones: Object.keys(PORT_ZONES).length,
      zones,
    };
  }
}
