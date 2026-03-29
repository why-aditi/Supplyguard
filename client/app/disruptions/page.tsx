'use client';

import { useSupplyGuardStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import RiskScoreCard from '@/components/RiskScoreCard';
import { DISRUPTION_TYPE_LABELS } from '@/lib/types';
import {
  missionControl,
  mcRowTop,
  mcRowCenter,
  mcSidebarSlot,
  mcMapViewport,
  floatingHeaderWithMetrics,
  headerActionsShrink,
  glassPanel,
  glassPanelBright,
} from '@/lib/uiClasses';

export default function DisruptionsPage() {
  const { disruptions, wsConnected } = useSupplyGuardStore();

  return (
    <div className={missionControl}>
      <div className={mcRowTop}>
        <header className={`${floatingHeaderWithMetrics} items-center`}>
          <div className="min-w-0">
            <h1 className="font-tech text-cyan-400">DISRUPTION LOG</h1>
            <span className="font-tech ml-4 mt-1 block text-xs opacity-70 sm:ml-0 sm:inline sm:mt-0">
              Intelligence Event Stream
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
              <span className="ml-4 opacity-60">{disruptions.length} EVENTS DETECTED</span>
            </div>
          </div>
        </header>
      </div>

      <div className={mcRowCenter}>
        <aside className={mcSidebarSlot}>
          <Sidebar />
        </aside>

        <main className={`${mcMapViewport} ${glassPanel} overflow-y-auto p-6 sm:p-8`}>
          <div className="h-full">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-tech text-2xl tracking-tighter">
                <span className="mr-3 text-rose-500">⚠️</span>
                NETWORK DISRUPTIONS
              </h2>
            </div>

            {disruptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                <p className="mb-6 text-6xl">🌊</p>
                <p className="font-tech text-lg">No active disruptions detected</p>
                <p className="font-mono mt-4 text-xs">
                  Autonomous surveillance system operational. Events will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className={`${glassPanelBright} overflow-hidden rounded-xl shadow-2xl`}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 font-tech text-xs text-muted">
                      <th className="p-4 text-left uppercase tracking-widest">Time (UTC)</th>
                      <th className="p-4 text-left uppercase tracking-widest">Event Type</th>
                      <th className="p-4 text-left uppercase tracking-widest">Location / Node</th>
                      <th className="p-4 text-center uppercase tracking-widest">Severity</th>
                      <th className="p-4 text-center uppercase tracking-widest">Confidence</th>
                      <th className="p-4 text-right uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disruptions.map((d, i) => (
                      <tr
                        key={`${d.id}-${i}`}
                        className="group border-b border-white/5 transition-colors hover:bg-white/5"
                      >
                        <td className="p-4 font-mono text-xs opacity-80">
                          {new Date(d.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-4 font-tech text-sm">
                          {DISRUPTION_TYPE_LABELS[d.disruption_type] || d.disruption_type}
                        </td>
                        <td className="p-4 font-mono text-sm">{d.location || d.affected_node_id}</td>
                        <td className="p-4 text-center">
                          <span
                            className="inline-block rounded-full px-3 py-1 font-mono text-[10px] font-bold"
                            style={{
                              background:
                                d.severity > 0.7
                                  ? 'rgba(239,68,68,0.2)'
                                  : d.severity > 0.4
                                    ? 'rgba(245,158,11,0.2)'
                                    : 'rgba(16,185,129,0.2)',
                              color:
                                d.severity > 0.7 ? '#fca5a5' : d.severity > 0.4 ? '#fcd34d' : '#6ee7b7',
                              border: `1px solid ${
                                d.severity > 0.7
                                  ? 'rgba(239,68,68,0.3)'
                                  : d.severity > 0.4
                                    ? 'rgba(245,158,11,0.3)'
                                    : 'rgba(16,185,129,0.3)'
                              }`,
                            }}
                          >
                            {(d.severity * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-xs text-slate-400">
                          {(d.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`rounded border px-2 py-1 font-tech text-[10px] ${
                              d.resolved
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {d.resolved ? '✓ RESOLVED' : '● ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
