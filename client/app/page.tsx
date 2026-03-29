'use client';

import { useState } from 'react';
import { useSupplyGuardStore } from '@/lib/store';
import SupplyMap from '@/components/SupplyMap';
import RiskScoreCard from '@/components/RiskScoreCard';
import RecommendationDrawer from '@/components/RecommendationDrawer';
import Sidebar from '@/components/Sidebar';
import SimulateControls from '@/components/SimulateControls';
import {
  missionControl,
  mcRowTop,
  mcRowCenter,
  mcSidebarSlot,
  mcMapViewport,
  mapInnerContainer,
  mapOverlayVignette,
  floatingHeaderWithMetrics,
  headerActionsShrink,
  modalOverlay,
  modalOverlayRight,
  modalContent,
  modalCloseBtn,
  btnSimulateTrigger,
  glassPanel,
} from '@/lib/uiClasses';

export default function DashboardPage() {
  const { nodes, wsConnected } = useSupplyGuardStore();
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  return (
    <div className={missionControl}>
      <div className={mcRowTop}>
        <header className={`${floatingHeaderWithMetrics} items-center`}>
          <div className="min-w-0">
            <div>
              <h1 className="font-tech text-cyan-400">SUPPLYGUARD AI</h1>
            </div>
          </div>

          <RiskScoreCard compact />

          <div className={`${headerActionsShrink} flex items-center gap-3 sm:gap-6`}>
            <button type="button" className={btnSimulateTrigger} onClick={() => setIsSimulateModalOpen(true)}>
              <span className="mr-1">🎮</span> SIMULATE
            </button>

            <div className="flex items-center gap-2 font-mono">
              <div
                className={`h-2 w-2 shrink-0 rounded-full ${
                  wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.65)]' : 'bg-slate-500'
                }`}
              />
              <span>{wsConnected ? 'LIVE ' : 'OFFLINE '}</span>
              <span className="opacity-80">{nodes.length} NODES</span>
            </div>
          </div>
        </header>
      </div>

      <div className={mcRowCenter}>
        <aside className={mcSidebarSlot}>
          <Sidebar />
        </aside>

        <main className={`${mcMapViewport} ${glassPanel}`}>
          <div className={mapInnerContainer}>
            <SupplyMap />
          </div>
          <div className={mapOverlayVignette} />
        </main>
      </div>

      <RecommendationDrawer />

      {isSimulateModalOpen && (
        <div className={modalOverlayRight} onClick={() => setIsSimulateModalOpen(false)} role="presentation">
          <div className={modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button type="button" className={modalCloseBtn} onClick={() => setIsSimulateModalOpen(false)} aria-label="Close">
              ✕
            </button>
            <SimulateControls onSimulateExecuted={() => setIsSimulateModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
