'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSupplyGuardStore } from '@/lib/store';
import { glassPanel } from '@/lib/uiClasses';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/disruptions', label: 'Disruptions', icon: '⚠️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { nodes, disruptions } = useSupplyGuardStore();

  const disruptedCount = nodes.filter((n) => n.current_risk > 0.3).length;
  const activeEvents = disruptions.filter((d) => !d.resolved).length;

  return (
    <aside
      className={`${glassPanel} flex h-full w-full flex-col overflow-y-auto rounded-2xl border border-cyan-500/15 bg-slate-900/65 py-6 shadow-2xl backdrop-blur-[32px]`}
    >
      <div className="mb-4 px-4">
        <h4 className="font-tech text-[10px] uppercase tracking-[0.08em] text-muted">Intelligence</h4>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'border-l-[3px] border-cyan-400 bg-blue-500/15 text-cyan-400'
                  : 'border-l-[3px] border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="font-tech">{item.label}</span>
              {item.href === '/disruptions' && activeEvents > 0 && (
                <span className="ml-auto min-w-[18px] rounded-[10px] bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                  {activeEvents}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-2 mt-4 flex gap-3 border-t border-white/10 px-3.5 pt-4">
        <div className="flex flex-1 flex-col items-center">
          <span
            className="font-mono text-[22px] font-bold"
            style={{ color: disruptedCount > 0 ? '#f43f5e' : '#10b981' }}
          >
            {disruptedCount}
          </span>
          <span className="font-tech text-[10px] uppercase tracking-wide text-muted">At Risk</span>
        </div>
        <div className="flex flex-1 flex-col items-center border-l border-white/5">
          <span className="font-mono text-[22px] font-bold text-cyan-400">{nodes.length}</span>
          <span className="font-tech text-[10px] uppercase tracking-wide text-muted">Nodes</span>
        </div>
      </div>

      <div className="mx-2 mt-auto flex flex-col gap-4 border-t border-white/10 px-3.5 pt-4">
        <h4 className="font-tech text-[10px] uppercase tracking-[0.08em] text-muted">Network Topology</h4>
        <div className="flex flex-col gap-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">⚓</span> Port
          </div>
          <div className="flex items-center gap-2">
            <span className="text-violet-500">🏭</span> Factory
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">📦</span> Warehouse
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">🔧</span> Supplier
          </div>
          <div className="flex items-center gap-2">
            <span className="text-pink-500">🚢</span> Carrier
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-2 font-tech text-[10px] uppercase tracking-[0.08em] text-muted">Risk Intensity</h4>
          <div className="mb-1 h-1.5 rounded bg-gradient-to-r from-green-600 via-amber-500 to-red-600" />
          <div className="flex justify-between font-mono text-[9px] font-semibold text-slate-500 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
