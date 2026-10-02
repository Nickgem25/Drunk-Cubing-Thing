import React, { useState, memo } from 'react';
import CubeView from './CubeView';

const STATUS_COLOR = { Mastered: '#22c55e', Learning: '#eab308', Unlearned: '#ef4444' };

const AlgCard = memo(function AlgCard({ alg, status, selected, onToggleStatus, onToggleSelect, onTrain }) {
  const [viewMode, setViewMode] = useState('2D');

  const toggleBtn = (mode) => ({
    padding: '2px 6px',
    fontSize: '0.7rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: viewMode === mode ? '#3b82f6' : 'transparent',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
  });

  return (
    <div style={{
      border: `1px solid ${selected ? '#3b82f6' : '#333'}`,
      borderRadius: '12px',
      padding: '16px',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <div>
        {/* Header: checkbox + title | category + 2D/3D toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(alg.id)}
              style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
            />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{alg.name}</h2>
          </label>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ background: '#2d2d2d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {alg.category}
            </span>
            <div style={{ display: 'flex', background: '#2d2d2d', padding: '2px', borderRadius: '6px' }}>
              <button onClick={() => setViewMode('3D')} style={toggleBtn('3D')}>3D</button>
              <button onClick={() => setViewMode('2D')} style={toggleBtn('2D')}>2D</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          <CubeView alg={alg.alg} category={alg.category} mode={viewMode} />
        </div>

        <p style={{ fontFamily: 'var(--mono)', background: '#2d2d2d', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', margin: '12px 0', wordBreak: 'break-all', textAlign: 'center', letterSpacing: '0.5px' }}>
          {alg.alg}
        </p>

        {alg.notes && (
          <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '16px', textAlign: 'center' }}>
            💡 {alg.notes}
          </p>
        )}
      </div>

      {/* Bottom row: status + train */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onToggleStatus(alg.id)}
          style={{ flex: 1, padding: '10px', backgroundColor: STATUS_COLOR[status], color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s ease' }}
        >
          {status}
        </button>
        <button
          onClick={() => onTrain(alg.id)}
          style={{ padding: '10px 14px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ▶ Train
        </button>
      </div>
    </div>
  );
});

export default AlgCard;
