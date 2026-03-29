'use client';

import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const envVars = [
    { key: 'GEMINI_API_KEY', desc: 'Google AI Studio key for Gemini LLM', required: true },
    { key: 'GROK_API_KEY', desc: 'xAI console key for Grok fallback', required: false },
    { key: 'AISSTREAM_API_KEY', desc: 'AISstream.io key for vessel tracking (free)', required: false },
    { key: 'LLM_TIMEOUT_MS', desc: 'Timeout before Grok fallback activates', default: '8000' },
    { key: 'NEWSAPI_KEY', desc: 'NewsAPI.org key (100 req/day free)', required: false },
    { key: 'DATABASE_URL', desc: 'PostgreSQL connection string', required: true },
    { key: 'REDIS_URL', desc: 'Redis connection string', required: true },
    { key: 'ML_SERVICE_URL', desc: 'Python ML service URL', default: 'http://localhost:8000' },
    { key: 'NLP_CONFIDENCE_THRESHOLD', desc: 'Minimum NLP confidence', default: '0.55' },
    { key: 'GRAPH_DECAY_FACTOR', desc: 'BFS propagation decay per hop', default: '0.7' },
    { key: 'GRAPH_MAX_DEPTH', desc: 'Maximum BFS propagation depth', default: '6' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🛡️</span>
            <h1>SupplyGuard AI</h1>
          </div>
          <span className="header-subtitle">Settings & Configuration</span>
        </div>
      </header>
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="disruptions-page">
            <h2>⚙️ Configuration Reference</h2>
            <p style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '24px' }}>
              Environment variables are stored in <code style={{ color: '#F59E0B' }}>.env</code>{' '}
              (never committed). Update values in the file and restart the server.
            </p>
            <table className="disruptions-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Default</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v) => (
                  <tr key={v.key}>
                    <td>
                      <code style={{ color: '#3B82F6', fontSize: '12px' }}>{v.key}</code>
                    </td>
                    <td>{v.desc}</td>
                    <td style={{ color: '#9CA3AF' }}>{v.default || '—'}</td>
                    <td>
                      {v.required ? (
                        <span style={{ color: '#EF4444' }}>Yes</span>
                      ) : (
                        <span style={{ color: '#6B7280' }}>No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
