'use client';

import { useEffect, useRef } from 'react';
import { useSupplyGuardStore } from '@/lib/store';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    updateRiskScore,
    batchUpdateRiskScores,
    addDisruption,
    resetRiskScores,
    setWsConnected,
  } = useSupplyGuardStore();

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    function connect() {
      const ws = new WebSocket(`${wsUrl}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'init':
              // Initial state sync
              if (data.risks) {
                batchUpdateRiskScores(data.risks);
              }
              if (data.disruptions) {
                data.disruptions.forEach((d: any) => addDisruption(d));
              }
              break;

            case 'risk_update':
              updateRiskScore(data.node_id, data.risk_score);
              break;

            case 'disruption':
              addDisruption(data);
              break;

            case 'reset':
              resetRiskScores();
              break;

            case 'vessel_update':
              // AISstream vessel position — silently consumed (future: render on map)
              break;

            default:
              console.warn('Unknown WS message type:', data.type);
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);
        // Auto-reconnect after 3s
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
