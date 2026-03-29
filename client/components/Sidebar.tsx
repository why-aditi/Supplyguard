'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSupplyGuardStore } from '@/lib/store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/disruptions', label: 'Disruptions', icon: '⚠️' },
  { href: '/simulate', label: 'Simulate', icon: '🎮' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { nodes, disruptions } = useSupplyGuardStore();

  const disruptedCount = nodes.filter((n) => n.current_risk > 0.3).length;
  const activeEvents = disruptions.filter((d) => !d.resolved).length;

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header px-4 mb-4">
        <h4 className="legend-title font-tech">Intelligence</h4>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link glass-interactive ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label font-tech">{item.label}</span>
            {item.href === '/disruptions' && activeEvents > 0 && (
              <span className="sidebar-badge">{activeEvents}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-stats">
        <div className="sidebar-stat">
          <span className="stat-number font-mono" style={{ color: disruptedCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {disruptedCount}
          </span>
          <span className="stat-label font-tech">At Risk</span>
        </div>
        <div className="sidebar-stat border-l border-white/5">
          <span className="stat-number font-mono" style={{ color: 'var(--accent-cyan)' }}>{nodes.length}</span>
          <span className="stat-label font-tech">Nodes</span>
        </div>
      </div>

      <div className="sidebar-legend">
        <h4 className="legend-title font-tech">Network Topology</h4>
        <div className="legend-items">
          <div className="legend-item"><span style={{ color: 'var(--accent-cyan)' }}>⚓</span> Port</div>
          <div className="legend-item"><span style={{ color: '#8B5CF6' }}>🏭</span> Factory</div>
          <div className="legend-item"><span style={{ color: 'var(--accent-amber)' }}>📦</span> Warehouse</div>
          <div className="legend-item"><span style={{ color: 'var(--accent-emerald)' }}>🔧</span> Supplier</div>
          <div className="legend-item"><span style={{ color: '#EC4899' }}>🚢</span> Carrier</div>
        </div>
        
        <div className="risk-level-container mt-6">
          <h4 className="legend-title font-tech">Risk Intensity</h4>
          <div className="risk-gradient-bar" />
          <div className="risk-gradient-labels font-mono">
            <span>0.0</span><span>0.5</span><span>1.0</span>
          </div>
        </div>
      </div>
    </aside>

  );
}
