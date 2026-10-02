import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import CubeView from './CubeView';
import { makeCase } from '../utils/scramble';
import { useIsMobile } from '../hooks/useIsMobile';
import { best, average, bestOf, ao, bestAo, formatTime } from '../utils/stats';

const HOLD_MS = 300; // how long to hold before the timer turns green

const PHASE_HINT = {
  idle: 'Hold space (or hold the timer) until it turns green',
  holding: 'Keep holding…',
  ready: 'Release to start',
  running: 'Press any key or tap to stop',
  stopped: 'Tap for next case, or hold to start it',
};

const btnClass = (active) => (active ? 'btn active' : 'btn');

// Blur after click so a focused button doesn't also react to the spacebar
const act = (fn) => (e) => { e.currentTarget.blur(); fn(); };

// Buttons inside the timer area must not start/stop the timer when pressed
const stop = (e) => e.stopPropagation();

export default function Trainer({ algorithms, ids, solves, onRecord, onDeleteLast, onClearAll, onBack, sideSlot }) {
  const pool = useMemo(() => {
    const set = new Set(ids);
    return algorithms.filter((a) => set.has(a.id));
  }, [algorithms, ids]);

  const [current, setCurrent] = useState(() => makeCase(pool));
  const [viewMode, setViewMode] = useState('2D');
  const [scope, setScope] = useState('case'); // 'case' | 'selected'
  const [phase, setPhase] = useState('idle'); // idle | holding | ready | running | stopped
  const [elapsed, setElapsed] = useState(0);
  const [mobileTab, setMobileTab] = useState('trainer'); // phone only: 'trainer' | 'stats'
  const isMobile = useIsMobile();

  // Refs hold values the event listeners need to read without going stale
  const phaseRef = useRef('idle');
  const startRef = useRef(0);
  const holdRef = useRef(null);
  const rafRef = useRef(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  const changePhase = (p) => { phaseRef.current = p; setPhase(p); };
  const nextCase = () => setCurrent((prev) => makeCase(pool, prev?.alg.id));

  const press = () => {
    const p = phaseRef.current;
    if (p === 'running') {
      cancelAnimationFrame(rafRef.current);
      const ms = performance.now() - startRef.current;
      setElapsed(ms);
      changePhase('stopped');
      onRecord(currentRef.current.alg.id, ms);
    } else if (p === 'idle' || p === 'stopped') {
      if (p === 'stopped') { nextCase(); setElapsed(0); }
      changePhase('holding');
      holdRef.current = setTimeout(() => changePhase('ready'), HOLD_MS);
    }
  };

  const release = () => {
    const p = phaseRef.current;
    if (p === 'holding') {
      clearTimeout(holdRef.current);
      changePhase('idle');
    } else if (p === 'ready') {
      startRef.current = performance.now();
      changePhase('running');
      const tick = () => {
        setElapsed(performance.now() - startRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const cancelHold = () => {
    if (phaseRef.current === 'holding' || phaseRef.current === 'ready') {
      clearTimeout(holdRef.current);
      changePhase('idle');
    }
  };

  const skip = () => {
    clearTimeout(holdRef.current);
    cancelAnimationFrame(rafRef.current);
    changePhase('idle');
    setElapsed(0);
    nextCase();
  };

  // Keep the latest press/release reachable from the listeners below
  const pressRef = useRef(press);
  const releaseRef = useRef(release);
  pressRef.current = press;
  releaseRef.current = release;

  useEffect(() => {
    const down = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault(); // stop the page from scrolling
        pressRef.current();
      } else if (phaseRef.current === 'running') {
        pressRef.current(); // any key stops a running timer
      }
    };
    const up = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        releaseRef.current();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      clearTimeout(holdRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Times for the stats panel, oldest first
  const times = useMemo(() => {
    const set = new Set(pool.map((a) => a.id));
    return solves
      .filter((s) => (scope === 'case' ? s.id === current?.alg.id : set.has(s.id)))
      .map((s) => s.ms);
  }, [solves, scope, pool, current]);

  const stats = [
    ['Solves', times.length],
    ['Best', formatTime(best(times))],
    ['Mean', formatTime(average(times))],
    ['Best of 5', formatTime(bestOf(times, 5))],
    ['Best of 10', formatTime(bestOf(times, 10))],
    ['Ao5', formatTime(ao(times, 5))],
    ['Ao10', formatTime(ao(times, 10))],
    ['Best Ao5', formatTime(bestAo(times, 5))],
    ['Best Ao10', formatTime(bestAo(times, 10))],
  ];

  // Stats + "delete all history". Sidebar on bigger screens, its own tab on phones
  const statsPanel = (
    <div className="side-col">
      <div className="panel">
        <div className="seg">
          <button className={btnClass(scope === 'case')} onClick={act(() => setScope('case'))}>This case</button>
          <button className={btnClass(scope === 'selected')} onClick={act(() => setScope('selected'))}>All selected</button>
        </div>
        <div className="stats-grid">
          {stats.map(([label, value]) => (
            <div key={label} className="stat">
              <div className="label">{label}</div>
              <div className="value">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn danger" disabled={solves.length === 0} onClick={act(onClearAll)}>
        Delete all history ({solves.length})
      </button>
    </div>
  );

  const hasSolveForCase = current ? solves.some((s) => s.id === current.alg.id) : false;
  const showStats = isMobile && mobileTab === 'stats';
  const revealed = phase === 'stopped'; // the case diagram is hidden until you stop the timer

  const emptyState = (
    <div className="trainer-empty">
      <p>Select at least one case in the Library first.</p>
      <button className="btn active" onClick={onBack}>Go to Library</button>
    </div>
  );

  // The whole box is the timer: hold anywhere on it. data-phase drives the colours in CSS
  const trainerBox = current && (
    <div
      className="trainer-zone"
      data-phase={phase}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
    >
      {/* Centre: time, hint, and the solution once you stop. Drawn first so the corners sit on top */}
      <div className="trainer-center">
        <div className="time">{formatTime(elapsed)}</div>
        <div className="hint">{PHASE_HINT[phase]}</div>

        {/* Solution: hidden until the timer stops */}
        {phase === 'stopped' && (
          <div className="panel solution">
            <h2>
              {current.alg.name} <span className="cat">{current.alg.category}</span>
            </h2>
            <p className="mono-box">{current.alg.alg}</p>
            {(current.pre || current.post) && (
              <p className="auf">
                {current.pre && <>Pre-AUF: {current.pre}. </>}
                {current.post && <>Post-AUF: {current.post}.</>}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="trainer-scramble-box">
        <p className="mono-box trainer-scramble">{current.scramble}</p>
        <p className="case-label">Scramble (yellow top, green front)</p>
      </div>
      {/* Top left: the case (hidden until you solve). key= remounts the player so it never shows a stale case */}
      <div className="panel trainer-case" onPointerDown={stop} onPointerUp={stop}>
        <div className={revealed ? 'case-view' : 'case-view hidden'}>
          <CubeView key={current.solution} alg={current.solution} category={current.alg.category} mode={viewMode} size={180} />
          {!revealed && <span className="case-q">?</span>}
        </div>
        <p className="case-label">{revealed ? 'This was the case' : 'Case shows after you solve'}</p>
      </div>

      {/* Top right: view options */}
      <div className="trainer-tools" onPointerDown={stop} onPointerUp={stop}>
        <span className="muted">Training {pool.length} case{pool.length === 1 ? '' : 's'}</span>
        <div className="seg">
          <button className={btnClass(viewMode === '2D')} onClick={act(() => setViewMode('2D'))}>2D</button>
          <button className={btnClass(viewMode === '3D')} onClick={act(() => setViewMode('3D'))}>3D</button>
        </div>
        <button className="btn" onClick={act(onBack)}>Change cases</button>
      </div>

      {/* Bottom left */}
      <div className="trainer-bottom" onPointerDown={stop} onPointerUp={stop}>
        <button className="btn" onClick={act(skip)}>Skip case</button>
        {hasSolveForCase && (
          <button className="btn" onClick={act(() => onDeleteLast(current.alg.id))}>Delete last time</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="trainer-page">
      {/* Phone only: switch between the trainer and its stats */}
      {isMobile && (
        <div className="seg mobile-tabs">
          <button className={btnClass(mobileTab === 'trainer')} onClick={act(() => setMobileTab('trainer'))}>Trainer</button>
          <button
            className={btnClass(mobileTab === 'stats')}
            disabled={phase === 'running' || phase === 'holding' || phase === 'ready'}
            onClick={act(() => setMobileTab('stats'))}
          >
            Stats
          </button>
        </div>
      )}

      {showStats ? statsPanel : current ? trainerBox : emptyState}

      {/* Bigger screens: stats are drawn in the sidebar (portal) */}
      {!isMobile && sideSlot && createPortal(statsPanel, sideSlot)}
    </div>
  );
}
