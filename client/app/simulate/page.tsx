'use client';

import { useSupplyGuardStore } from '@/lib/store';
import SimulateControls from '@/components/SimulateControls';
import SupplyMap from '@/components/SupplyMap';
import Sidebar from '@/components/Sidebar';
import RiskScoreCard from '@/components/RiskScoreCard';
import DisruptionBanner from '@/components/DisruptionBanner';

export default function SimulatePage() {
  return (
    <div className="dashboard">
      <DisruptionBanner />
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🛡️</span>
            <h1>SupplyGuard AI</h1>
          </div>
          <span className="header-subtitle">Simulation Control Panel</span>
        </div>
      </header>
      <RiskScoreCard />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main" style={{ display: 'flex' }}>
          <div style={{ flex: '0 0 380px', overflowY: 'auto', borderRight: '1px solid rgba(75,85,99,0.4)' }}>
            <SimulateControls />
          </div>
          <div style={{ flex: 1 }}>
            <SupplyMap />
          </div>
        </main>
      </div>
    </div>
  );
}
