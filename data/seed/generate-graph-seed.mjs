/**
 * Generates data/seed/graph-seed.json — dense real-world–style supply chain graph.
 * Run: node data/seed/generate-graph-seed.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'graph-seed.json');

function n(type, id, name, lat, lng, country, tier, centrality) {
  return {
    id,
    name,
    type,
    location: { lat, lng, country },
    current_risk: 0,
    tier,
    centrality,
  };
}

// ── Ports (major container / logistics hubs + chokepoints) ──────────────
const PORT_RAW = [
  ['port-shanghai', 'Port of Shanghai', 31.23, 121.47, 'China', 1, 0.92],
  ['port-shenzhen', 'Port of Shenzhen', 22.54, 114.05, 'China', 1, 0.85],
  ['port-ningbo', 'Port of Ningbo-Zhoushan', 29.87, 121.55, 'China', 1, 0.9],
  ['port-qingdao', 'Port of Qingdao', 36.07, 120.32, 'China', 1, 0.84],
  ['port-tianjin', 'Port of Tianjin', 38.97, 117.75, 'China', 1, 0.83],
  ['port-xiamen', 'Port of Xiamen', 24.48, 118.09, 'China', 2, 0.72],
  ['port-singapore', 'Port of Singapore', 1.26, 103.84, 'Singapore', 1, 0.95],
  ['port-tanjung-pelepas', 'Port of Tanjung Pelepas', 1.37, 103.55, 'Malaysia', 2, 0.68],
  ['port-rotterdam', 'Port of Rotterdam', 51.95, 4.14, 'Netherlands', 1, 0.88],
  ['port-antwerp', 'Port of Antwerp-Bruges', 51.23, 4.42, 'Belgium', 1, 0.86],
  ['port-hamburg', 'Port of Hamburg', 53.54, 9.99, 'Germany', 1, 0.75],
  ['port-bremerhaven', 'Port of Bremerhaven', 53.59, 8.57, 'Germany', 2, 0.7],
  ['port-felixstowe', 'Port of Felixstowe', 51.95, 1.31, 'UK', 2, 0.74],
  ['port-lehavre', 'Port of Le Havre', 49.49, 0.11, 'France', 2, 0.55],
  ['port-barcelona', 'Port of Barcelona', 41.35, 2.18, 'Spain', 2, 0.72],
  ['port-piraeus', 'Port of Piraeus', 37.94, 23.64, 'Greece', 2, 0.7],
  ['port-la', 'Port of Los Angeles', 33.74, -118.27, 'USA', 1, 0.82],
  ['port-long-beach', 'Port of Long Beach', 33.75, -118.22, 'USA', 1, 0.8],
  ['port-oakland', 'Port of Oakland', 37.8, -122.27, 'USA', 2, 0.65],
  ['port-seattle', 'Port of Seattle', 47.6, -122.35, 'USA', 2, 0.68],
  ['port-savannah', 'Port of Savannah', 32.08, -81.09, 'USA', 2, 0.7],
  ['port-charleston', 'Port of Charleston', 32.78, -79.92, 'USA', 2, 0.66],
  ['port-houston', 'Port of Houston', 29.73, -95.27, 'USA', 2, 0.75],
  ['port-norfolk', 'Port of Virginia (Norfolk)', 36.95, -76.33, 'USA', 2, 0.67],
  ['port-vancouver', 'Port of Vancouver', 49.29, -123.03, 'Canada', 2, 0.72],
  ['port-busan', 'Port of Busan', 35.1, 129.04, 'South Korea', 1, 0.78],
  ['port-kaohsiung', 'Port of Kaohsiung', 22.62, 120.28, 'Taiwan', 2, 0.7],
  ['port-yokohama', 'Port of Yokohama', 35.44, 139.64, 'Japan', 2, 0.6],
  ['port-tokyo', 'Port of Tokyo', 35.62, 139.79, 'Japan', 2, 0.72],
  ['port-mumbai', 'Port of Mumbai (JNPT)', 18.95, 72.95, 'India', 2, 0.58],
  ['port-chennai', 'Port of Chennai', 13.1, 80.3, 'India', 2, 0.55],
  ['port-dubai', 'Port of Jebel Ali', 25.0, 55.06, 'UAE', 1, 0.72],
  ['port-jeddah', 'Port of Jeddah', 21.49, 39.18, 'Saudi Arabia', 2, 0.62],
  ['port-colombo', 'Port of Colombo', 6.94, 79.85, 'Sri Lanka', 2, 0.58],
  ['port-santos', 'Port of Santos', -23.96, -46.31, 'Brazil', 2, 0.65],
  ['hub-suez', 'Suez Canal', 30.46, 32.35, 'Egypt', 1, 0.88],
  ['hub-malacca', 'Strait of Malacca', 2.5, 101.8, 'Malaysia', 1, 0.82],
  ['hub-panama', 'Panama Canal', 9.08, -79.68, 'Panama', 1, 0.75],
];

const FACTORY_RAW = [
  ['factory-tsmc', 'TSMC Hsinchu Fab', 24.8, 120.97, 'Taiwan', 1, 0.9],
  ['factory-samsung', 'Samsung Pyeongtaek Plant', 36.99, 127.09, 'South Korea', 1, 0.82],
  ['factory-foxconn', 'Foxconn Zhengzhou', 34.75, 113.65, 'China', 1, 0.78],
  ['factory-luxshare', 'Luxshare Kunshan', 31.38, 120.98, 'China', 2, 0.65],
  ['factory-goertek', 'Goertek Weifang', 36.72, 119.15, 'China', 2, 0.58],
  ['factory-bosch', 'Bosch Stuttgart Plant', 48.78, 9.18, 'Germany', 2, 0.62],
  ['factory-toyota', 'Toyota Motomachi Plant', 35.05, 137.16, 'Japan', 2, 0.65],
  ['factory-honda', 'Honda Suzuka Factory', 34.88, 136.58, 'Japan', 2, 0.58],
  ['factory-intel', 'Intel Chandler Fab', 33.3, -111.84, 'USA', 2, 0.58],
  ['factory-byd', 'BYD Shenzhen Plant', 22.65, 114.0, 'China', 2, 0.55],
  ['factory-vw', 'Volkswagen Wolfsburg', 52.42, 10.79, 'Germany', 2, 0.6],
  ['factory-bmw', 'BMW Spartanburg', 35.1, -82.02, 'USA', 2, 0.58],
  ['factory-rivian', 'Rivian Normal Plant', 40.51, -88.99, 'USA', 2, 0.52],
  ['factory-tesla', 'Tesla Gigafactory Shanghai', 31.1, 121.73, 'China', 2, 0.58],
  ['factory-gigafactory-nv', 'Tesla Gigafactory Nevada', 39.54, -119.44, 'USA', 2, 0.52],
  ['factory-stellantis', 'Stellantis Tychy', 50.13, 19.0, 'Poland', 2, 0.55],
  ['factory-renault', 'Renault Flins', 49.03, 1.64, 'France', 2, 0.52],
  ['factory-nissan', 'Nissan Sunderland', 54.91, -1.47, 'UK', 2, 0.54],
  ['factory-hyundai', 'Hyundai Ulsan Plant', 35.55, 129.32, 'South Korea', 1, 0.72],
  ['factory-kia', 'Kia Gwangju Plant', 35.16, 126.92, 'South Korea', 2, 0.58],
  ['factory-apple-india', 'Apple Foxconn Chennai', 12.84, 80.15, 'India', 2, 0.45],
  ['factory-stmicro', 'STMicro Catania', 37.5, 15.09, 'Italy', 2, 0.55],
  ['factory-nxp-austin', 'NXP Austin Fab', 30.27, -97.74, 'USA', 2, 0.52],
  ['factory-micron-boise', 'Micron Boise', 43.62, -116.2, 'USA', 2, 0.5],
  ['factory-amkor', 'Amkor Tempe OSAT', 33.43, -111.94, 'USA', 2, 0.48],
  ['factory-delta', 'Delta Electronics Taoyuan', 24.99, 121.31, 'Taiwan', 2, 0.62],
  ['factory-compal', 'Compal Taoyuan', 25.01, 121.3, 'Taiwan', 2, 0.55],
  ['factory-wistron', 'Wistron Kunshan', 31.38, 120.98, 'China', 2, 0.56],
];

const WAREHOUSE_RAW = [
  ['warehouse-la', 'LA Distribution Center', 33.93, -118.24, 'USA', 3, 0.4],
  ['warehouse-chicago', 'Chicago Logistics Hub', 41.88, -87.63, 'USA', 3, 0.35],
  ['warehouse-memphis', 'Memphis Air Cargo Hub', 35.04, -89.98, 'USA', 3, 0.3],
  ['warehouse-frankfurt', 'Frankfurt Central Warehouse', 50.11, 8.68, 'Germany', 3, 0.38],
  ['warehouse-rotterdam', 'Rotterdam Europoort Hub', 51.89, 4.29, 'Netherlands', 3, 0.35],
  ['warehouse-antwerp-dc', 'Antwerp 3PL DC', 51.2, 4.42, 'Belgium', 3, 0.34],
  ['warehouse-dubai', 'Dubai Free Zone Hub', 25.22, 55.28, 'UAE', 3, 0.35],
  ['warehouse-tokyo', 'Tokyo Distribution Center', 35.68, 139.69, 'Japan', 3, 0.32],
  ['warehouse-osaka', 'Osaka Logistics Park', 34.69, 135.5, 'Japan', 3, 0.33],
  ['warehouse-singapore', 'Singapore Logistics Hub', 1.35, 103.82, 'Singapore', 3, 0.38],
  ['warehouse-shenzhen', 'Shenzhen Bonded Warehouse', 22.55, 114.1, 'China', 3, 0.3],
  ['warehouse-hong-kong', 'Hong Kong Free Port', 22.31, 114.17, 'Hong Kong', 2, 0.55],
  ['warehouse-mumbai', 'Mumbai Warehouse', 19.08, 72.88, 'India', 3, 0.25],
  ['warehouse-bangalore', 'Bangalore Fulfillment Hub', 12.97, 77.59, 'India', 3, 0.32],
  ['warehouse-mexico', 'Mexico City Bonded DC', 19.43, -99.13, 'Mexico', 3, 0.38],
  ['warehouse-sao-paulo', 'São Paulo 3PL', -23.55, -46.63, 'Brazil', 3, 0.34],
  ['warehouse-sydney', 'Sydney Distribution', -33.87, 151.21, 'Australia', 3, 0.36],
  ['warehouse-melbourne', 'Melbourne Logistics', -37.81, 144.96, 'Australia', 3, 0.33],
  ['warehouse-johannesburg', 'Johannesburg Hub', -26.2, 28.04, 'South Africa', 3, 0.3],
  ['warehouse-dublin', 'Dublin EU Fulfillment', 53.35, -6.26, 'Ireland', 3, 0.4],
  ['warehouse-warsaw', 'Warsaw Central DC', 52.23, 21.01, 'Poland', 3, 0.35],
  ['warehouse-prague', 'Prague Regional DC', 50.08, 14.44, 'Czech Republic', 3, 0.32],
  ['warehouse-stockholm', 'Stockholm Nordic Hub', 59.33, 18.07, 'Sweden', 3, 0.33],
  ['warehouse-toronto', 'Toronto 3PL', 43.65, -79.38, 'Canada', 3, 0.36],
  ['warehouse-montreal', 'Montreal Distribution', 45.5, -73.57, 'Canada', 3, 0.34],
  ['warehouse-seoul', 'Seoul Fulfillment', 37.57, 126.98, 'South Korea', 3, 0.38],
  ['warehouse-hcmc', 'Ho Chi Minh Logistics', 10.82, 106.63, 'Vietnam', 3, 0.36],
  ['warehouse-jakarta', 'Jakarta Bonded DC', -6.2, 106.85, 'Indonesia', 3, 0.34],
];

const SUPPLIER_RAW = [
  ['supplier-catl', 'CATL Battery (Ningde)', 26.65, 119.52, 'China', 2, 0.68],
  ['supplier-lg-chem', 'LG Chem Ochang', 36.72, 127.43, 'South Korea', 2, 0.55],
  ['supplier-sk-hynix', 'SK Hynix Icheon', 37.27, 127.44, 'South Korea', 2, 0.6],
  ['supplier-murata', 'Murata Kyoto', 35.01, 135.77, 'Japan', 2, 0.52],
  ['supplier-infineon', 'Infineon Dresden', 51.05, 13.74, 'Germany', 2, 0.5],
  ['supplier-nxp', 'NXP Eindhoven', 51.44, 5.47, 'Netherlands', 3, 0.42],
  ['supplier-basf', 'BASF Ludwigshafen', 49.48, 8.43, 'Germany', 3, 0.38],
  ['supplier-panasonic', 'Panasonic Energy Osaka', 34.69, 135.5, 'Japan', 2, 0.48],
  ['supplier-qualcomm', 'Qualcomm San Diego', 32.9, -117.19, 'USA', 2, 0.55],
  ['supplier-mediatek', 'MediaTek Hsinchu', 24.8, 120.97, 'Taiwan', 2, 0.5],
  ['supplier-rare-earth', 'Baotou Rare Earth', 40.66, 109.84, 'China', 1, 0.72],
  ['supplier-lithium-cl', 'Atacama Lithium (SQM)', -23.5, -68.2, 'Chile', 1, 0.65],
  ['supplier-copper-cl', 'Escondida Copper', -24.27, -69.07, 'Chile', 2, 0.5],
  ['supplier-tdk', 'TDK Chikumagawa', 36.43, 138.44, 'Japan', 2, 0.48],
  ['supplier-alps', 'Alps Electric Tokyo', 35.69, 139.75, 'Japan', 2, 0.46],
  ['supplier-valeo', 'Valeo Paris', 48.85, 2.35, 'France', 2, 0.44],
  ['supplier-continental', 'Continental Hanover', 52.38, 9.7, 'Germany', 2, 0.5],
  ['supplier-denso', 'Denso Aichi', 35.18, 137.01, 'Japan', 2, 0.52],
  ['supplier-autoliv', 'Autoliv Vårgårda', 58.04, 12.81, 'Sweden', 2, 0.45],
  ['supplier-aptiv', 'Aptiv Troy MI', 42.61, -83.15, 'USA', 2, 0.48],
  ['supplier-magna', 'Magna Graz', 47.07, 15.44, 'Austria', 2, 0.5],
  ['supplier-zf', 'ZF Friedrichshafen', 47.66, 9.48, 'Germany', 2, 0.52],
  ['supplier-samsung-sdi', 'Samsung SDI Giheung', 37.4, 127.12, 'South Korea', 2, 0.56],
  ['supplier-onsemi', 'onsemi Scottsdale', 33.49, -111.93, 'USA', 2, 0.46],
  ['supplier-ti', 'Texas Instruments Dallas', 32.78, -96.8, 'USA', 2, 0.54],
  ['supplier-analog', 'Analog Devices Wilmington', 42.55, -71.17, 'USA', 2, 0.48],
  ['supplier-stmicro', 'STMicro Geneva', 46.2, 6.14, 'Switzerland', 2, 0.5],
  ['supplier-ams', 'ams OSRAM Premstätten', 47.07, 15.4, 'Austria', 2, 0.44],
];

const CARRIER_RAW = [
  ['carrier-maersk', 'Maersk Line', 55.68, 12.57, 'Denmark', 1, 0.85],
  ['carrier-msc', 'MSC Mediterranean', 46.2, 6.14, 'Switzerland', 1, 0.75],
  ['carrier-cma', 'CMA CGM Marseille', 43.3, 5.37, 'France', 1, 0.78],
  ['carrier-hapag', 'Hapag-Lloyd Hamburg', 53.55, 9.99, 'Germany', 1, 0.76],
  ['carrier-cosco', 'COSCO Shipping', 31.23, 121.47, 'China', 1, 0.78],
  ['carrier-evergreen', 'Evergreen Marine', 25.03, 121.57, 'Taiwan', 2, 0.58],
  ['carrier-one', 'Ocean Network Express', 35.4, 139.65, 'Japan', 1, 0.72],
  ['carrier-hmm', 'HMM Seoul', 37.57, 126.98, 'South Korea', 2, 0.65],
  ['carrier-zim', 'ZIM Haifa', 32.82, 34.99, 'Israel', 2, 0.58],
  ['carrier-yangming', 'Yang Ming Kaohsiung', 22.62, 120.28, 'Taiwan', 2, 0.56],
  ['carrier-dhl', 'DHL Express', 50.11, 8.68, 'Germany', 2, 0.6],
  ['carrier-fedex', 'FedEx Memphis', 35.05, -89.98, 'USA', 2, 0.55],
  ['carrier-ups', 'UPS Worldport Louisville', 38.17, -85.74, 'USA', 2, 0.58],
  ['carrier-amazon-air', 'Amazon Air CVG', 39.05, -84.67, 'USA', 2, 0.52],
];

function toNodes(raw, type) {
  return raw.map((r) => n(type, r[0], r[1], r[2], r[3], r[4], r[5], r[6]));
}

const nodes = [
  ...toNodes(PORT_RAW, 'port'),
  ...toNodes(FACTORY_RAW, 'factory'),
  ...toNodes(WAREHOUSE_RAW, 'warehouse'),
  ...toNodes(SUPPLIER_RAW, 'supplier'),
  ...toNodes(CARRIER_RAW, 'carrier'),
];

const edges = [];
const edgeKey = (s, t) => `${s}|${t}`;
const seen = new Set();

function addEdge(source, target, opts = {}) {
  const k = edgeKey(source, target);
  if (seen.has(k)) return;
  seen.add(k);
  edges.push({
    source,
    target,
    weight: opts.weight ?? 0.65,
    lead_time_days: opts.lead_time_days ?? 5,
    transport_mode: opts.transport_mode ?? 'sea',
    annual_volume_usd: opts.annual_volume_usd ?? 2_000_000_000,
  });
}

const portIds = PORT_RAW.map((r) => r[0]);
const factoryIds = FACTORY_RAW.map((r) => r[0]);
const warehouseIds = WAREHOUSE_RAW.map((r) => r[0]);
const supplierIds = SUPPLIER_RAW.map((r) => r[0]);
const carrierIds = CARRIER_RAW.map((r) => r[0]);

// ── Trunk / hub routes (sea) ───────────────────────────────────────────
const trunkPairs = [
  ['port-shanghai', 'hub-malacca'],
  ['port-shenzhen', 'hub-malacca'],
  ['port-ningbo', 'hub-malacca'],
  ['hub-malacca', 'port-singapore'],
  ['port-singapore', 'hub-suez'],
  ['hub-suez', 'port-rotterdam'],
  ['hub-suez', 'port-piraeus'],
  ['port-rotterdam', 'port-antwerp'],
  ['port-antwerp', 'port-hamburg'],
  ['port-la', 'port-long-beach'],
  ['port-la', 'hub-panama'],
  ['hub-panama', 'port-santos'],
  ['port-shanghai', 'port-busan'],
  ['port-busan', 'port-yokohama'],
  ['port-yokohama', 'port-tokyo'],
  ['port-mumbai', 'port-dubai'],
  ['port-dubai', 'hub-suez'],
  ['port-singapore', 'port-mumbai'],
  ['port-singapore', 'port-colombo'],
  ['port-qingdao', 'port-tianjin'],
  ['port-vancouver', 'port-seattle'],
  ['port-seattle', 'port-oakland'],
  ['port-savannah', 'port-charleston'],
  ['port-houston', 'port-norfolk'],
];

for (const [a, b] of trunkPairs) {
  if (portIds.includes(a) && portIds.includes(b)) {
    addEdge(a, b, { weight: 0.72, lead_time_days: 6, transport_mode: 'sea', annual_volume_usd: 25_000_000_000 });
  }
}

// Regional port meshes (short hops)
function mesh(ids, step = 2) {
  for (let i = 0; i < ids.length; i += step) {
    const j = (i + 1) % ids.length;
    if (ids[i] !== ids[j]) addEdge(ids[i], ids[j], { weight: 0.5, lead_time_days: 3, transport_mode: 'sea' });
  }
}

const chinaPorts = ['port-shanghai', 'port-ningbo', 'port-qingdao', 'port-tianjin', 'port-xiamen', 'port-shenzhen'];
const usWest = ['port-vancouver', 'port-seattle', 'port-oakland', 'port-la', 'port-long-beach'];
const usEast = ['port-savannah', 'port-charleston', 'port-norfolk', 'port-houston'];
const euNorth = ['port-rotterdam', 'port-antwerp', 'port-hamburg', 'port-bremerhaven', 'port-felixstowe'];

for (const group of [chinaPorts, usWest, usEast, euNorth]) {
  const ok = group.filter((id) => portIds.includes(id));
  for (let i = 0; i < ok.length - 1; i++) {
    addEdge(ok[i], ok[i + 1], { weight: 0.48, lead_time_days: 4, transport_mode: 'sea' });
  }
}

// Carriers → many ports (service lanes)
for (let c = 0; c < carrierIds.length; c++) {
  const cid = carrierIds[c];
  const picks = [
    portIds[c % portIds.length],
    portIds[(c * 3) % portIds.length],
    portIds[(c * 7 + 5) % portIds.length],
    portIds[(c * 11 + 2) % portIds.length],
  ];
  for (const pid of new Set(picks)) {
    addEdge(cid, pid, { weight: 0.55 + (c % 5) * 0.03, lead_time_days: 0, transport_mode: 'sea', annual_volume_usd: 0 });
  }
}

// DHL / FedEx / UPS → hubs (air)
addEdge('carrier-dhl', 'warehouse-frankfurt', { weight: 0.75, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });
addEdge('carrier-dhl', 'warehouse-singapore', { weight: 0.6, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });
addEdge('carrier-fedex', 'warehouse-memphis', { weight: 0.9, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });
addEdge('carrier-fedex', 'warehouse-la', { weight: 0.62, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });
addEdge('carrier-ups', 'warehouse-chicago', { weight: 0.7, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });
addEdge('carrier-amazon-air', 'warehouse-memphis', { weight: 0.65, lead_time_days: 0, transport_mode: 'air', annual_volume_usd: 0 });

// Suppliers → factories (materials)
const sfPairs = [
  ['supplier-catl', 'factory-tesla'],
  ['supplier-catl', 'factory-byd'],
  ['supplier-lg-chem', 'factory-samsung'],
  ['supplier-lg-chem', 'factory-hyundai'],
  ['supplier-sk-hynix', 'factory-samsung'],
  ['supplier-sk-hynix', 'factory-kia'],
  ['supplier-murata', 'factory-foxconn'],
  ['supplier-murata', 'factory-toyota'],
  ['supplier-infineon', 'factory-bosch'],
  ['supplier-infineon', 'factory-vw'],
  ['supplier-nxp', 'factory-bosch'],
  ['supplier-basf', 'factory-vw'],
  ['supplier-panasonic', 'factory-tesla'],
  ['supplier-qualcomm', 'factory-foxconn'],
  ['supplier-mediatek', 'factory-compal'],
  ['supplier-rare-earth', 'factory-tsmc'],
  ['supplier-rare-earth', 'factory-samsung'],
  ['supplier-lithium-cl', 'supplier-catl'],
  ['supplier-lithium-cl', 'supplier-lg-chem'],
  ['supplier-copper-cl', 'supplier-murata'],
  ['supplier-tdk', 'factory-honda'],
  ['supplier-denso', 'factory-toyota'],
  ['supplier-zf', 'factory-bmw'],
  ['supplier-magna', 'factory-stellantis'],
  ['supplier-samsung-sdi', 'factory-hyundai'],
  ['supplier-ti', 'factory-intel'],
  ['supplier-onsemi', 'factory-micron-boise'],
  ['supplier-stmicro', 'factory-stmicro'],
];

for (const [s, f] of sfPairs) {
  if (supplierIds.includes(s) && factoryIds.includes(f)) {
    addEdge(s, f, { weight: 0.65, lead_time_days: 4, transport_mode: 'road', annual_volume_usd: 1_500_000_000 });
  }
}

// Extra supplier → factory rings
for (let i = 0; i < supplierIds.length; i++) {
  const s = supplierIds[i];
  const f = factoryIds[i % factoryIds.length];
  addEdge(s, f, { weight: 0.52, lead_time_days: 5, transport_mode: 'road', annual_volume_usd: 800_000_000 });
}

// Factories → ports (export)
const fpPairs = [
  ['factory-tsmc', 'port-kaohsiung'],
  ['factory-samsung', 'port-busan'],
  ['factory-foxconn', 'port-shanghai'],
  ['factory-foxconn', 'port-shenzhen'],
  ['factory-byd', 'port-shenzhen'],
  ['factory-tesla', 'port-shanghai'],
  ['factory-bosch', 'port-hamburg'],
  ['factory-vw', 'port-hamburg'],
  ['factory-toyota', 'port-yokohama'],
  ['factory-intel', 'port-la'],
  ['factory-bmw', 'port-charleston'],
  ['factory-apple-india', 'port-mumbai'],
  ['factory-gigafactory-nv', 'port-oakland'],
  ['factory-hyundai', 'port-busan'],
  ['factory-nissan', 'port-felixstowe'],
  ['factory-stmicro', 'port-barcelona'],
  ['factory-wistron', 'port-shanghai'],
  ['factory-compal', 'port-shanghai'],
];

for (const [f, p] of fpPairs) {
  if (factoryIds.includes(f) && portIds.includes(p)) {
    addEdge(f, p, { weight: 0.78, lead_time_days: 2, transport_mode: 'road', annual_volume_usd: 5_000_000_000 });
  }
}

for (let i = 0; i < factoryIds.length; i++) {
  const f = factoryIds[i];
  const p = portIds[i % portIds.length];
  addEdge(f, p, { weight: 0.62, lead_time_days: 3, transport_mode: 'road', annual_volume_usd: 2_000_000_000 });
}

// Ports → warehouses (import / distribution)
const pwPairs = [
  ['port-la', 'warehouse-la'],
  ['port-long-beach', 'warehouse-la'],
  ['port-rotterdam', 'warehouse-rotterdam'],
  ['port-antwerp', 'warehouse-antwerp-dc'],
  ['port-hamburg', 'warehouse-frankfurt'],
  ['port-dubai', 'warehouse-dubai'],
  ['port-yokohama', 'warehouse-tokyo'],
  ['port-tokyo', 'warehouse-tokyo'],
  ['port-singapore', 'warehouse-singapore'],
  ['port-shenzhen', 'warehouse-shenzhen'],
  ['port-mumbai', 'warehouse-mumbai'],
  ['port-mumbai', 'warehouse-bangalore'],
  ['port-vancouver', 'warehouse-toronto'],
  ['port-seattle', 'warehouse-toronto'],
  ['port-felixstowe', 'warehouse-dublin'],
  ['port-barcelona', 'warehouse-mexico'],
];

for (const [p, w] of pwPairs) {
  if (portIds.includes(p) && warehouseIds.includes(w)) {
    addEdge(p, w, { weight: 0.82, lead_time_days: 2, transport_mode: 'road', annual_volume_usd: 8_000_000_000 });
  }
}

for (let i = 0; i < warehouseIds.length; i++) {
  const w = warehouseIds[i];
  const p = portIds[i % portIds.length];
  addEdge(p, w, { weight: 0.58, lead_time_days: 3, transport_mode: 'road', annual_volume_usd: 3_000_000_000 });
}

// Warehouse cross-links (land/rail)
const wwPairs = [
  ['warehouse-la', 'warehouse-chicago'],
  ['warehouse-chicago', 'warehouse-memphis'],
  ['warehouse-frankfurt', 'warehouse-warsaw'],
  ['warehouse-rotterdam', 'warehouse-antwerp-dc'],
  ['warehouse-shenzhen', 'warehouse-hong-kong'],
  ['warehouse-hong-kong', 'warehouse-singapore'],
  ['warehouse-toronto', 'warehouse-montreal'],
  ['warehouse-stockholm', 'warehouse-osaka'],
];

for (const [a, b] of wwPairs) {
  if (warehouseIds.includes(a) && warehouseIds.includes(b)) {
    addEdge(a, b, { weight: 0.55, lead_time_days: 4, transport_mode: 'rail', annual_volume_usd: 4_000_000_000 });
  }
}

// Factory → factory (components)
addEdge('factory-foxconn', 'factory-apple-india', { weight: 0.42, lead_time_days: 12, transport_mode: 'sea', annual_volume_usd: 2_000_000_000 });
addEdge('factory-bosch', 'factory-vw', { weight: 0.8, lead_time_days: 2, transport_mode: 'road', annual_volume_usd: 5_000_000_000 });

// Extra density: additional port-port and supplier-port legs
const extraPortLinks = [
  ['port-qingdao', 'port-busan'],
  ['port-tianjin', 'port-shanghai'],
  ['port-xiamen', 'port-kaohsiung'],
  ['port-jeddah', 'port-dubai'],
  ['port-colombo', 'hub-malacca'],
  ['port-chennai', 'port-colombo'],
  ['port-piraeus', 'port-barcelona'],
  ['port-lehavre', 'port-felixstowe'],
  ['port-oakland', 'port-long-beach'],
  ['port-norfolk', 'port-savannah'],
];
for (const [a, b] of extraPortLinks) {
  if (portIds.includes(a) && portIds.includes(b)) {
    addEdge(a, b, { weight: 0.55, lead_time_days: 5, transport_mode: 'sea', annual_volume_usd: 6_000_000_000 });
  }
}

for (let i = 0; i < portIds.length; i += 4) {
  const a = portIds[i];
  const b = portIds[(i + 11) % portIds.length];
  if (a !== b) addEdge(a, b, { weight: 0.42, lead_time_days: 8, transport_mode: 'sea', annual_volume_usd: 3_000_000_000 });
}

for (let i = 0; i < Math.min(supplierIds.length, 20); i++) {
  const p = portIds[(i * 5 + 3) % portIds.length];
  addEdge(supplierIds[i], p, { weight: 0.45, lead_time_days: 14, transport_mode: 'sea', annual_volume_usd: 900_000_000 });
}

const out = {
  metadata: {
    version: '2.0',
    generated: new Date().toISOString().slice(0, 10),
    description: `SupplyGuard seed graph — ${nodes.length} nodes, ${edges.length} edges (dense multi-type supply chain)`,
  },
  nodes,
  edges,
};

writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf-8');
console.log(`Wrote ${OUT} (${nodes.length} nodes, ${edges.length} edges)`);

const byType = {};
for (const node of nodes) {
  byType[node.type] = (byType[node.type] || 0) + 1;
}
console.log('Nodes by type:', byType);
