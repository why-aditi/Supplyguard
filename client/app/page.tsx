'use client';

import { useSupplyGuardStore } from '@/lib/store';
import SupplyMap from '@/components/SupplyMap';
import RiskScoreCard from '@/components/RiskScoreCard';
import DisruptionBanner from '@/components/DisruptionBanner';
import RecommendationDrawer from '@/components/RecommendationDrawer';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const { nodes, wsConnected } = useSupplyGuardStore();

  return (
    <div className="dashboard-mission-control">
      {/* 1. Header & Alerts Row */}
      <div className="mc-row-top">
        <DisruptionBanner />
        <header className="floating-header glass-panel">
          <div className="header-brand">
            <div className="brand-logo">
              <h1 className="font-tech text-cyan-400">SUPPLYGUARD AI</h1>
            </div>
          </div>
          <div className="header-status font-mono">
            <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
            <span className="header-node-count">{nodes.length} NODES</span>
          </div>
        </header>
      </div>

      {/* 2. Primary Command Center (Sidebar + Boxed Map) */}
      <div className="mc-row-center">
        <aside className="mc-sidebar-slot">
          <Sidebar />
        </aside>

        <main className="mc-map-viewport glass-panel">
          <div className="map-inner-container">
            <SupplyMap />
          </div>
          <div className="map-overlay-vignette" />
        </main>
      </div>

      {/* 3. Global Information Row */}
      <div className="mc-row-bottom">
        <section className="floating-metrics">
          <RiskScoreCard />
        </section>
      </div>

      {/* 4. Overlays */}
      <RecommendationDrawer />
    </div>
  );
}



