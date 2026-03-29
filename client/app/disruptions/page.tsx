'use client';

import { useSupplyGuardStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import DisruptionBanner from '@/components/DisruptionBanner';
import RiskScoreCard from '@/components/RiskScoreCard';
import { DISRUPTION_TYPE_LABELS } from '@/lib/types';

export default function DisruptionsPage() {
  const { disruptions, wsConnected } = useSupplyGuardStore();

  return (
    <div className="dashboard-mission-control">
      {/* 1. Header & Alerts Row */}
      <div className="mc-row-top">
        <DisruptionBanner />
        <header className="floating-header glass-panel">
          <div className="header-brand">
            <div className="brand-logo">
              <h1 className="font-tech text-cyan-400">DISRUPTION LOG</h1>
            </div>
            <span className="header-subtitle font-tech text-xs ml-4 opacity-70">
              Intelligence Event Stream
            </span>
          </div>
          <div className="header-status font-mono">
            <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
            <span className="header-node-count ml-4 opacity-60">
              {disruptions.length} EVENTS DETECTED
            </span>
          </div>
        </header>
      </div>

      {/* 2. Primary Command Center (Sidebar + Main Content) */}
      <div className="mc-row-center">
        <aside className="mc-sidebar-slot">
          <Sidebar />
        </aside>

        <main className="mc-map-viewport glass-panel" style={{ overflowY: 'auto', padding: '32px' }}>
          <div className="disruptions-page-content h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-tech text-2xl tracking-tighter">
                <span className="text-rose-500 mr-3">⚠️</span>
                NETWORK DISRUPTIONS
              </h2>
            </div>

            {disruptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                <p className="text-6xl mb-6">🌊</p>
                <p className="font-tech text-lg">No active disruptions detected</p>
                <p className="font-mono text-xs mt-4">
                  Autonomous surveillance system operational. Events will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="glass-panel-bright rounded-xl overflow-hidden shadow-2xl">
                <table className="disruptions-table w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 font-tech text-xs text-muted">
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
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                      >
                        <td className="p-4 font-mono text-xs opacity-80">
                          {new Date(d.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-4 font-tech text-sm">
                          {DISRUPTION_TYPE_LABELS[d.disruption_type] || d.disruption_type}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {d.location || d.affected_node_id}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className="severity-pill inline-block px-3 py-1 rounded-full font-mono text-[10px] font-bold"
                            style={{
                              background:
                                d.severity > 0.7
                                  ? 'rgba(239,68,68,0.2)'
                                  : d.severity > 0.4
                                  ? 'rgba(245,158,11,0.2)'
                                  : 'rgba(16,185,129,0.2)',
                              color:
                                d.severity > 0.7
                                  ? '#FCA5A5'
                                  : d.severity > 0.4
                                  ? '#FCD34D'
                                  : '#6EE7B7',
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
                        <td className="p-4 text-center font-mono text-xs text-secondary">
                          {(d.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`font-tech text-[10px] px-2 py-1 rounded border ${
                              d.resolved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
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

      {/* 3. Metrics Row */}
      <div className="mc-row-bottom">
        <section className="floating-metrics">
          <RiskScoreCard />
        </section>
      </div>
    </div>
  );
}
