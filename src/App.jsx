import React, { useState, useEffect, useCallback, memo } from 'react';
import initialAlgorithms from './algorithms.json';
import 'cubing/twisty';

const STORAGE_KEY = 'statuses';
const DEFAULT_STATUS = 'Unlearned';
const NEXT_STATUS = { Unlearned: 'Learning', Learning: 'Mastered', Mastered: 'Unlearned' };
const STATUS_COLOR = { Mastered: '#22c55e', Learning: '#eab308', Unlearned: '#ef4444' };

// Read saved statuses once. Returns {} if nothing saved or data is corrupted.
function loadStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

// Wrapped in memo: only re-renders when its own props change
const AlgCard = memo(function AlgCard({ alg, status, onToggleStatus }) {
  const [viewMode, setViewMode] = useState('2D'); // 2D default: much lighter than WebGL on phones

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
      border: '1px solid #333',
      borderRadius: '12px',
      padding: '16px',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between', // fixed: was "justify"
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <div>
        {/* Header: title + category + 2D/3D toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{alg.name}</h2>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{
              background: '#2d2d2d',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: '#3b82f6',
            }}>
              {alg.category}
            </span>

            <div style={{ display: 'flex', background: '#2d2d2d', padding: '2px', borderRadius: '6px' }}>
              <button onClick={() => setViewMode('3D')} style={toggleBtn('3D')}>3D</button>
              <button onClick={() => setViewMode('2D')} style={toggleBtn('2D')}>2D</button>
            </div>
          </div>
        </div>

        {/* Cube visualizer.
            setup-alg "z2" + anchor "end" = show the case this alg SOLVES,
            with yellow on top. */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          <twisty-player
            alg={alg.alg}
            puzzle="3x3x3"
            background="none"
            control-panel="none"
            visualization={viewMode === '2D' ? 'experimental-2D-LL' : '3D'}
            experimental-stickering-mask-orbits={
              alg.category === 'OLL'
                ? 'EDGES:IIIIOOOOIIII,CORNERS:IIIIOOOO,CENTERS:IIIII-'
                : undefined
            }
            experimental-setup-alg="z2"
            experimental-setup-anchor="end"
            style={{ width: '150px', height: '150px' }}
          ></twisty-player>
        </div>

        {/* Algorithm string */}
        <p style={{
          fontFamily: 'monospace',
          background: '#2d2d2d',
          padding: '10px',
          borderRadius: '6px',
          fontSize: '0.9rem',
          margin: '12px 0',
          wordBreak: 'break-all',
          textAlign: 'center',
          letterSpacing: '0.5px',
        }}>
          {alg.alg}
        </p>

        {/* Notes */}
        <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '16px', textAlign: 'center' }}>
          💡 {alg.notes}
        </p>
      </div>

      {/* Status button */}
      <button
        onClick={() => onToggleStatus(alg.id)}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: STATUS_COLOR[status],
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
      >
        {status}
      </button>
    </div>
  );
});

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Only stores what the user changed: { [algId]: status }
  const [statuses, setStatuses] = useState(loadStatuses);

  // Save whenever statuses change (one storage key instead of one per alg)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch {
      // storage full or blocked: app still works, just won't persist
    }
  }, [statuses]);

  // useCallback = same function identity every render, so memo(AlgCard) can skip re-renders
  const toggleStatus = useCallback((id) => {
    setStatuses(prev => {
      const current = prev[id] || DEFAULT_STATUS;
      return { ...prev, [id]: NEXT_STATUS[current] };
    });
  }, []);

  const getStatus = (id) => statuses[id] || DEFAULT_STATUS;

  // Stats counters (computed from the full list, not just saved entries)
  const counts = { Mastered: 0, Learning: 0, Unlearned: 0 };
  initialAlgorithms.forEach(alg => { counts[getStatus(alg.id)]++; });

  // Filter
  const query = searchTerm.toLowerCase();
  const filteredAlgs = initialAlgorithms.filter(alg => {
    const matchesSearch = alg.name.toLowerCase().includes(query) ||
      alg.alg.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || alg.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', color: '#fff' }}>

      {/* Title & stats */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 12px 0' }}>Drunk Cubing Manager</h1>

        <div style={{ display: 'inline-flex', gap: '12px', background: '#1e1e1e', padding: '8px 16px', borderRadius: '20px', border: '1px solid #333' }}>
          <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 'bold' }}>Mastered: {counts.Mastered}</span>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 'bold' }}>Learning: {counts.Learning}</span>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold' }}>Unlearned: {counts.Unlearned}</span>
        </div>
      </div>

      {/* Search & category filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search algorithm or moves..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #444',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'PLL', 'OLL'].map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                flex: '1',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: selectedCategory === category ? '#3b82f6' : '#1e1e1e',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: '1px solid #333', // duplicate "border: none" removed
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
      }}>
        {filteredAlgs.map(alg => (
          <AlgCard
            key={alg.id}
            alg={alg}
            status={getStatus(alg.id)}
            onToggleStatus={toggleStatus}
          />
        ))}
      </div>

      {filteredAlgs.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No algorithms found.</p>
      )}
    </div>
  );
}
