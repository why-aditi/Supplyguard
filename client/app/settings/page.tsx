'use client';

import Sidebar from '@/components/Sidebar';
import {
  dashboardContent,
  dashboardHeader,
  dashboardMain,
  dashboardRoot,
} from '@/lib/uiClasses';

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
    <div className={dashboardRoot}>
      <header className={dashboardHeader}>
        <div className="flex items-center gap-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SupplyGuard AI</h1>
            <span className="text-sm text-slate-400">Settings & Configuration</span>
          </div>
        </div>
      </header>
      <div className={dashboardContent}>
        <Sidebar />
        <main className={dashboardMain}>
          <div className="p-8">
            <h2 className="mb-2 text-[22px] font-bold">⚙️ Configuration Reference</h2>
            <p className="mb-6 text-[13px] text-slate-400">
              Environment variables are stored in <code className="text-amber-500">.env</code> (never committed).
              Update values in the file and restart the server.
            </p>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Variable
                  </th>
                  <th className="p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Description
                  </th>
                  <th className="p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Default
                  </th>
                  <th className="p-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Required
                  </th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v) => (
                  <tr key={v.key} className="border-b border-slate-700/50 hover:bg-white/5">
                    <td className="p-3">
                      <code className="text-xs text-blue-400">{v.key}</code>
                    </td>
                    <td className="p-3 text-slate-400">{v.desc}</td>
                    <td className="p-3 text-slate-500">{v.default || '—'}</td>
                    <td className="p-3">
                      {v.required ? (
                        <span className="text-rose-400">Yes</span>
                      ) : (
                        <span className="text-slate-500">No</span>
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
