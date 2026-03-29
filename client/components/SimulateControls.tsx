'use client';

import { useState } from 'react';
import { useSupplyGuardStore } from '@/lib/store';
import { triggerSimulation, resetSimulation } from '@/lib/api';
import { DISRUPTION_TYPE_LABELS } from '@/lib/types';

const disruptionTypes = [
  'port_delay',
  'weather_event',
  'supplier_failure',
  'geopolitical',
  'transport_strike',
  'customs_delay',
] as const;

export default function SimulateControls() {
  const { nodes } = useSupplyGuardStore();
  const [selectedNode, setSelectedNode] = useState('');
  const [disruptionType, setDisruptionType] = useState('port_delay');
  const [severity, setSeverity] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));

  async function handleSimulate() {
    if (!selectedNode) return;
    setLoading(true);
    try {
      const result = await triggerSimulation(selectedNode, disruptionType, severity);
      setLastResult(result);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    try {
      await resetSimulation();
      setLastResult(null);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="simulate-page">
      <h2>🎮 Simulate Disruption</h2>
      <p className="subtitle">
        Trigger a simulated supply chain disruption to see how risk propagates
        through the network and generates rerouting recommendations.
      </p>

      <div className="simulate-form">
        <div className="form-group">
          <label>Target Node</label>
          <select
            className="form-select"
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
          >
            <option value="">Select a node…</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} ({node.type} · {node.location.country})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Disruption Type</label>
          <select
            className="form-select"
            value={disruptionType}
            onChange={(e) => setDisruptionType(e.target.value)}
          >
            {disruptionTypes.map((type) => (
              <option key={type} value={type}>
                {DISRUPTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Severity: {(severity * 100).toFixed(0)}%</label>
          <input
            type="range"
            className="form-input"
            min="0.1"
            max="1.0"
            step="0.05"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSimulate}
            disabled={!selectedNode || loading}
          >
            {loading ? '⏳ Simulating…' : '💥 Trigger Disruption'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading}
          >
            🔄 Reset All
          </button>
        </div>
      </div>

      {lastResult?.recommendations && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#10B981' }}>
            ✅ Recommendations Generated
          </h3>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '8px' }}>
            Source: {lastResult.recommendations.llm_source || 'LLM'} · {' '}
            {lastResult.recommendations.recommendations?.length || 0} alternates found
          </p>
        </div>
      )}
    </div>
  );
}
