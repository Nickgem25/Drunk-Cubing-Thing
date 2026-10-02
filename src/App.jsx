import React, { useState, useMemo, useCallback } from 'react';
import initialAlgorithms from './algorithms.json';
import AlgCard from './components/AlgCard';
import CubeView from './components/CubeView';
import Trainer from './components/Trainer';
import Timer from './components/Timer';
import { useLocalStorage } from './hooks/useLocalStorage';

const DEFAULT_STATUS = 'Unlearned';
const NEXT_STATUS = { Unlearned: 'Learning', Learning: 'Mastered', Mastered: 'Unlearned' };
const ALL_IDS = new Set(initialAlgorithms.map((a) => a.id));
const MAX_SOLVES = 5000;

// Select chips: two groups. Same group adds together, the two groups narrow each other.
const TYPE_CHIPS = ['PLL', 'OLL'];
const STATUS_CHIPS = ['Learning', 'Unlearned', 'Mastered'];

// Build a className string: 'tab' normally, 'tab active' when active
const tabClass = (active) => (active ? 'tab active' : 'tab');
const chipClass = (active) => (active ? 'chip active' : 'chip');
const subClass = (active) => (active ? 'sub-tile active' : 'sub-tile');

export default function App() {
  const [view, setView] = useState('library'); // 'library' | 'trainer' | 'timer'
  const [sideSlot, setSideSlot] = useState(null); // empty box in the sidebar that pages can render into
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSub, setSelectedSub] = useState('All'); // subcategory tile
  const [activeChips, setActiveChips] = useState([]); // toggled select chips (not saved)

  // Persisted data
  const [statuses, setStatuses] = useLocalStorage('statuses', {});       // { [algId]: status }
  const [selectedIds, setSelectedIds] = useLocalStorage('selectedIds', []); // cases to train
  const [solves, setSolves] = useLocalStorage('solves', []);             // [{ id, ms, at }], oldest first

  const getStatus = (id) => statuses[id] || DEFAULT_STATUS;

  // Drop any saved ids that no longer exist in algorithms.json
  const validIds = useMemo(() => selectedIds.filter((id) => ALL_IDS.has(id)), [selectedIds]);
  const selectedSet = useMemo(() => new Set(validIds), [validIds]);

  // Stable callbacks so memo(AlgCard) can skip re-renders
  const toggleStatus = useCallback((id) => {
    setStatuses((prev) => ({ ...prev, [id]: NEXT_STATUS[prev[id] || DEFAULT_STATUS] }));
  }, [setStatuses]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [setSelectedIds]);

  const trainOne = useCallback((id) => {
    setSelectedIds([id]);
    setView('trainer');
  }, [setSelectedIds]);

  const recordSolve = useCallback((id, ms) => {
    setSolves((prev) => [...prev.slice(-(MAX_SOLVES - 1)), { id, ms, at: Date.now() }]);
  }, [setSolves]);

  const deleteLastSolve = useCallback((id) => {
    setSolves((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].id === id) return prev.filter((_, j) => j !== i);
      }
      return prev;
    });
  }, [setSolves]);

  const clearAllSolves = useCallback(() => {
    if (window.confirm('Delete the trainer history for ALL cases? This cannot be undone.')) setSolves([]);
  }, [setSolves]);

  const changeCategory = (category) => {
    setSelectedCategory(category);
    setSelectedSub('All'); // subcategories differ per category, so reset
  };

  // Subcategory tiles for the chosen category: count + the first case (used for the diagram)
  const subcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const subs = {};
    initialAlgorithms.forEach((a) => {
      if (a.category === selectedCategory && a.subcategory) {
        if (!subs[a.subcategory]) subs[a.subcategory] = { count: 0, sample: a };
        subs[a.subcategory].count++;
      }
    });
    return Object.entries(subs).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedCategory]);

  // Which case ids a set of toggled chips stands for.
  // PLL + OLL = both. PLL + Learning = only the PLL cases you're learning. No chips = nothing.
  const idsForChips = (chips) => {
    if (chips.length === 0) return [];
    const types = chips.filter((c) => TYPE_CHIPS.includes(c));
    const stats = chips.filter((c) => STATUS_CHIPS.includes(c));
    return initialAlgorithms
      .filter((a) =>
        (types.length === 0 || types.includes(a.category)) &&
        (stats.length === 0 || stats.includes(getStatus(a.id))))
      .map((a) => a.id);
  };

  const toggleChip = (chip) => {
    const next = activeChips.includes(chip) ? activeChips.filter((c) => c !== chip) : [...activeChips, chip];
    setActiveChips(next);
    setSelectedIds(idsForChips(next));
  };

  const clearSelection = () => {
    setActiveChips([]);
    setSelectedIds([]);
  };

  // Chips only show as "on" while the real selection still matches them.
  // Ticking a card, changing a status, or pressing a card's Train makes them go off by themselves.
  const expected = idsForChips(activeChips);
  const chipsMatch =
    activeChips.length > 0 &&
    expected.length === validIds.length &&
    expected.every((id) => selectedSet.has(id));
  const litChips = chipsMatch ? activeChips : [];

  // Dashboard counts
  const counts = { Mastered: 0, Learning: 0, Unlearned: 0 };
  initialAlgorithms.forEach((alg) => { counts[getStatus(alg.id)]++; });

  // Search + category filter
  const query = searchTerm.toLowerCase();
  const filteredAlgs = initialAlgorithms.filter((alg) => {
    const matchesSearch = alg.name.toLowerCase().includes(query) || alg.alg.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || alg.category === selectedCategory;
    const matchesSub = selectedSub === 'All' || alg.subcategory === selectedSub;
    return matchesSearch && matchesCategory && matchesSub;
  });

  return (
    <div className="app">
      {/* Sidebar: title + navigation (bottom bar on phones) */}
      <aside className="sidebar">
        <h1 className="title">Drunk Cubing Manager</h1>
        <nav className="nav">
          <button className={tabClass(view === 'library')} onClick={() => setView('library')}>Library</button>
          <button className={tabClass(view === 'trainer')} onClick={() => setView('trainer')}>
            Trainer ({validIds.length})
          </button>
          <button className={tabClass(view === 'timer')} onClick={() => setView('timer')}>Timer</button>
        </nav>
        <div className="sidebar-slot" ref={setSideSlot} />
      </aside>

      <main className="main">
      {view === 'timer' ? (
        <Timer sideSlot={sideSlot} />
      ) : view === 'trainer' ? (
        <Trainer
          algorithms={initialAlgorithms}
          ids={validIds}
          solves={solves}
          onRecord={recordSolve}
          onDeleteLast={deleteLastSolve}
          onClearAll={clearAllSolves}
          onBack={() => setView('library')}
          sideSlot={sideSlot}
        />
      ) : (
        <>
          {/* Progress pills */}
          <div className="progress">
            <div className="progress-pill">
              <span className="mastered">Mastered: {counts.Mastered}</span>
              <span className="sep">|</span>
              <span className="learning">Learning: {counts.Learning}</span>
              <span className="sep">|</span>
              <span className="unlearned">Unlearned: {counts.Unlearned}</span>
            </div>
          </div>

          {/* Search + category filter */}
          <div className="filters">
            <input
              className="search"
              type="text"
              placeholder="Search algorithm or moves..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="tabs">
              {['All', 'PLL', 'OLL'].map((category) => (
                <button
                  key={category}
                  className={tabClass(selectedCategory === category)}
                  onClick={() => changeCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Subcategory strip (only when PLL or OLL is chosen): scrolls sideways */}
            {subcategories.length > 0 && (
              <div className="sub-strip">
                <button className={subClass(selectedSub === 'All')} onClick={() => setSelectedSub('All')}>
                  <span className="sub-all">All</span>
                  <span className="sub-name">Everything</span>
                </button>
                {subcategories.map(([name, { count, sample }]) => (
                  <button
                    key={name}
                    className={subClass(selectedSub === name)}
                    onClick={() => setSelectedSub(name)}
                  >
                    <CubeView key={sample.id} alg={sample.alg} category={sample.category} mode="2D" size={64} />
                    <span className="sub-name">{name} ({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trainer case selection: toggle chips (two groups) */}
          <div className="select-row">
            <span className="label">Select:</span>
            {TYPE_CHIPS.map((c) => (
              <button key={c} className={chipClass(litChips.includes(c))} aria-pressed={litChips.includes(c)} onClick={() => toggleChip(c)}>
                {c}
              </button>
            ))}
            <span className="chip-sep" />
            {STATUS_CHIPS.map((c) => (
              <button key={c} className={chipClass(litChips.includes(c))} aria-pressed={litChips.includes(c)} onClick={() => toggleChip(c)}>
                {c}
              </button>
            ))}
            <span className="chip-sep" />
            <button className="chip" onClick={clearSelection}>Clear</button>
            <button
              className="chip primary"
              disabled={validIds.length === 0}
              onClick={() => setView('trainer')}
            >
              Train selected ({validIds.length})
            </button>
          </div>

          {/* Algorithm grid */}
          <div className="grid">
            {filteredAlgs.map((alg) => (
              <AlgCard
                key={alg.id}
                alg={alg}
                status={getStatus(alg.id)}
                selected={selectedSet.has(alg.id)}
                onToggleStatus={toggleStatus}
                onToggleSelect={toggleSelect}
                onTrain={trainOne}
              />
            ))}
          </div>

          {filteredAlgs.length === 0 && <p className="empty">No algorithms found.</p>}
        </>
      )}
      </main>
    </div>
  );
}
