'use client';

import { useSupplyGuardStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import DisruptionBanner from '@/components/DisruptionBanner';
import RiskScoreCard from '@/components/RiskScoreCard';
import { DISRUPTION_TYPE_LABELS } from '@/lib/types';

export default function DisruptionsPage() {
  const { disruptions, wsConnected } = useSupplyGuardStore();

  return (
    <div className="dashboard">
      <DisruptionBanner />
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🛡️</span>
            <h1>SupplyGuard AI</h1>
          </div>
          <span className="header-subtitle">Disruption Event Log</span>
        </div>
        <div className="header-status">
          <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">{wsConnected ? 'Live' : 'Offline'}</span>
        </div>
      </header>
      <RiskScoreCard />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="disruptions-page">
            <h2>⚠️ Disruption Events</h2>
            {disruptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</p>
                <p style={{ fontSize: '16px' }}>No disruptions detected</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  Events will appear here as they are detected or simulated.
                </p>
              </div>
            ) : (
              <table className="disruptions-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {disruptions.map((d, i) => (
                    <tr key={`${d.id}-${i}`}>
                      <td>{new Date(d.created_at).toLocaleString()}</td>
                      <td>
                        {DISRUPTION_TYPE_LABELS[d.disruption_type] || d.disruption_type}
                      </td>
                      <td>{d.location || d.affected_node_id}</td>
                      <td>
                        <span
                          className="severity-pill"
                          style={{
                            background:
                              d.severity > 0.7
                                ? 'rgba(239,68,68,0.15)'
                                : d.severity > 0.4
                                ? 'rgba(245,158,11,0.15)'
                                : 'rgba(16,185,129,0.15)',
                            color:
                              d.severity > 0.7
                                ? '#EF4444'
                                : d.severity > 0.4
                                ? '#F59E0B'
                                : '#10B981',
                          }}
                        >
                          {(d.severity * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td>{(d.confidence * 100).toFixed(0)}%</td>
                      <td style={{ color: d.resolved ? '#10B981' : '#EF4444' }}>
                        {d.resolved ? '✅ Resolved' : '🔴 Active'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
