'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { useSupplyGuardStore } from '@/lib/store';
import { loadSeedData, setSeedData } from '@/lib/graphData';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { setGraphData } = useSupplyGuardStore();

  // Single WebSocket connection for all pages
  useWebSocket();

  // Load seed data once
  useEffect(() => {
    loadSeedData().then(({ nodes, edges }) => {
      setSeedData(nodes, edges);
      setGraphData(nodes, edges);
    });
  }, [setGraphData]);

  return <>{children}</>;
}
