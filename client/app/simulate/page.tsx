'use client';

import { useSupplyGuardStore } from '@/lib/store';
import SimulateControls from '@/components/SimulateControls';
import SupplyMap from '@/components/SupplyMap';
import Sidebar from '@/components/Sidebar';
import RiskScoreCard from '@/components/RiskScoreCard';
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
  glassPanel,
  glassPanelBright,
} from '@/lib/uiClasses';

export default function SimulatePage() {
  const { wsConnected } = useSupplyGuardStore();

  return (
    <div className={missionControl}>
      <div className={mcRowTop}>
        <header className={`${floatingHeaderWithMetrics} items-center`}>
          <div className="min-w-0">
            <h1 className="font-tech text-amber-400">SIMULATION LAB</h1>
            <span className="font-tech ml-4 mt-1 block text-xs opacity-70 sm:ml-0 sm:inline sm:mt-0">
              Stress-Test Network Resilience
            </span>
          </div>
          <RiskScoreCard compact />
          <div className={`${headerActionsShrink} font-mono`}>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 shrink-0 rounded-full ${
                  wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.65)]' : 'bg-slate-500'
                }`}
              />
              <span>{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>
      </div>

      <div className={mcRowCenter}>
        <aside className={mcSidebarSlot}>
          <Sidebar />
        </aside>

        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-5">
          <div
            className={`${glassPanel} flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:w-[min(340px,100%)] lg:max-w-[380px] lg:shrink-0`}
          >
            <SimulateControls />
          </div>

          <main className={`${mcMapViewport} ${glassPanel} relative min-h-[260px] flex-1 lg:min-h-0`}>
            <div className={mapInnerContainer}>
              <SupplyMap />
            </div>
            <div className={mapOverlayVignette} />

            <div className="pointer-events-none absolute right-4 top-4">
              <div
                className={`${glassPanelBright} rounded border border-amber-500/30 px-3 py-2 font-tech text-[10px] tracking-widest text-amber-500`}
              >
                PROVISIONAL TOPOLOGY
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
