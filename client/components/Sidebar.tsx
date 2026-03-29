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
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.href === '/disruptions' && activeEvents > 0 && (
              <span className="sidebar-badge">{activeEvents}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-stats">
        <div className="sidebar-stat">
          <span className="stat-number" style={{ color: disruptedCount > 0 ? '#EF4444' : '#10B981' }}>
            {disruptedCount}
          </span>
          <span className="stat-label">At Risk</span>
        </div>
        <div className="sidebar-stat">
          <span className="stat-number" style={{ color: '#3B82F6' }}>{nodes.length}</span>
          <span className="stat-label">Total Nodes</span>
        </div>
      </div>

      <div className="sidebar-legend">
        <h4 className="legend-title">Node Types</h4>
        <div className="legend-items">
          <div className="legend-item"><span style={{ color: '#3B82F6' }}>⚓</span> Port</div>
          <div className="legend-item"><span style={{ color: '#8B5CF6' }}>🏭</span> Factory</div>
          <div className="legend-item"><span style={{ color: '#F59E0B' }}>📦</span> Warehouse</div>
          <div className="legend-item"><span style={{ color: '#10B981' }}>🔧</span> Supplier</div>
          <div className="legend-item"><span style={{ color: '#EC4899' }}>🚢</span> Carrier</div>
        </div>
        <h4 className="legend-title" style={{ marginTop: '12px' }}>Risk Level</h4>
        <div className="risk-gradient-bar" />
        <div className="risk-gradient-labels">
          <span>Low</span><span>Medium</span><span>High</span>
        </div>
      </div>
    </aside>
  );
}
