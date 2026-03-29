'use client';

import { useSupplyGuardStore } from '@/lib/store';
import SimulateControls from '@/components/SimulateControls';
import SupplyMap from '@/components/SupplyMap';
import Sidebar from '@/components/Sidebar';
import RiskScoreCard from '@/components/RiskScoreCard';
export default function SimulatePage() {
  const { wsConnected } = useSupplyGuardStore();

  return (
    <div className="dashboard-mission-control">
      {/* 1. Header & Alerts Row */}
      <div className="mc-row-top">
        <header className="floating-header floating-header--with-metrics glass-panel">
          <div className="header-brand">
            <div className="brand-logo">
              <h1 className="font-tech text-amber-400">SIMULATION LAB</h1>
            </div>
            <span className="header-subtitle font-tech text-xs ml-4 opacity-70">
              Stress-Test Network Resilience
            </span>
          </div>
          <RiskScoreCard compact />
          <div className="header-status font-mono header-actions-shrink">
            <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </header>
      </div>

      {/* 2. Primary Command Center (Sidebar + Controls + Map) */}
      <div className="mc-row-center">
        <aside className="mc-sidebar-slot">
          <Sidebar />
        </aside>

        <section className="flex-1 flex gap-5 overflow-hidden">
          {/* Simulation Controls Panel */}
          <div className="w-[340px] glass-panel p-6 flex flex-col shrink-0">
            <SimulateControls />
          </div>

          {/* Map Viewport */}
          <main className="flex-1 mc-map-viewport glass-panel relative">
            <div className="map-inner-container">
              <SupplyMap />
            </div>
            <div className="map-overlay-vignette" />
            
            {/* Map HUD Overlay */}
            <div className="absolute top-4 right-4 pointer-events-none">
              <div className="glass-panel-bright px-3 py-2 rounded font-tech text-[10px] tracking-widest text-amber-500 border border-amber-500/30">
                PROVISIONAL TOPOLOGY
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
