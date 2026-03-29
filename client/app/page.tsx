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
    <div className="dashboard">
      <DisruptionBanner />
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🛡️</span>
            <h1>SupplyGuard AI</h1>
          </div>
          <span className="header-subtitle">Supply Chain Disruption Detector</span>
        </div>
        <div className="header-status">
          <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">{wsConnected ? 'Live' : 'Offline'}</span>
          <span className="header-node-count">{nodes.length} nodes tracked</span>
        </div>
      </header>
      <RiskScoreCard />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <SupplyMap />
        </main>
      </div>
      <RecommendationDrawer />
    </div>
  );
}
