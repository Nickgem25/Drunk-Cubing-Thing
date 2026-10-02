import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import 'cubing/twisty';
import { generate3x3Scramble } from '../utils/scramble';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useIsMobile } from '../hooks/useIsMobile';
import { best, average, ao, bestAo, formatTime } from '../utils/stats';

const HOLD_MS = 300;
const MAX_SOLVES = 5000;
const HISTORY_SHOWN = 100; // the list scrolls, so we can show plenty

// A solve is { ms, penalty: null | '+2' | 'DNF', scramble, at }
const effective = (s) => (s.penalty === 'DNF' ? Infinity : s.ms + (s.penalty === '+2' ? 2000 : 0));
const formatSolve = (s) =>
  s.penalty === 'DNF' ? 'DNF' : formatTime(effective(s)) + (s.penalty === '+2' ? '+' : '');

// 15s countdown, then +2 until 17s, then DNF
const inspectionText = (ms) => (ms < 15000 ? String(15 - Math.floor(ms / 1000)) : ms < 17000 ? '+2' : 'DNF');

const btnClass = (active) => (active ? 'btn active' : 'btn');

// Blur after click so a focused button doesn't also react to the spacebar
const act = (fn) => (e) => { e.currentTarget.blur(); fn(); };

// Controls inside the timer box must not start/stop the timer when pressed
const stop = (e) => e.stopPropagation();

export default function Timer({ sideSlot }) {
  // Persisted
  const [solves, setSolves] = useLocalStorage('timerSolves', []);
  const [inspectionOn, setInspectionOn] = useLocalStorage('timerInspection', false);
  const [showPreview, setShowPreview] = useLocalStorage('timerPreview', true);

  const [scramble, setScramble] = useState(null); // null while generating
  const [phase, setPhase] = useState('idle'); // idle | inspecting | holding | ready | running | stopped
  const [elapsed, setElapsed] = useState(0);
  const [inInspection, setInInspection] = useState(false);
  const [inspMs, setInspMs] = useState(0);
  const [mobileTab, setMobileTab] = useState('timer'); // phone only: 'timer' | 'stats'
  const isMobile = useIsMobile();

  // Refs the event listeners read without going stale
  const phaseRef = useRef('idle');
  const startRef = useRef(0);
  const holdRef = useRef(null);
  const rafRef = useRef(null);
  const inspRafRef = useRef(null);
  const inspStartRef = useRef(0);
  const inspActiveRef = useRef(false);
  const penaltyRef = useRef(null);
  const scrambleRef = useRef(null);
  const reqRef = useRef(0);
  const inspectionOnRef = useRef(inspectionOn);
  scrambleRef.current = scramble;
  inspectionOnRef.current = inspectionOn;

  const changePhase = (p) => { phaseRef.current = p; setPhase(p); };

  const newScramble = async () => {
    const req = ++reqRef.current; // ignore results from older requests
    setScramble(null);
    const s = await generate3x3Scramble();
    if (req === reqRef.current) setScramble(s);
  };

  useEffect(() => { newScramble(); }, []);

  const startInspection = () => {
    inspActiveRef.current = true;
    setInInspection(true);
    inspStartRef.current = performance.now();
    setInspMs(0);
    changePhase('inspecting');
    const tick = () => {
      const e = performance.now() - inspStartRef.current;
      setInspMs(Math.floor(e / 100) * 100); // 10 updates/s is plenty
      inspRafRef.current = requestAnimationFrame(tick);
    };
    inspRafRef.current = requestAnimationFrame(tick);
  };

  const endInspection = () => {
    cancelAnimationFrame(inspRafRef.current);
    inspActiveRef.current = false;
    setInInspection(false);
  };

  const startSolve = () => {
    penaltyRef.current = null;
    if (inspActiveRef.current) {
      const e = performance.now() - inspStartRef.current;
      if (e >= 17000) penaltyRef.current = 'DNF';
      else if (e >= 15000) penaltyRef.current = '+2';
      endInspection();
    }
    startRef.current = performance.now();
    changePhase('running');
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopSolve = () => {
    cancelAnimationFrame(rafRef.current);
    const ms = performance.now() - startRef.current;
    setElapsed(ms);
    changePhase('stopped');
    setSolves((prev) => [
      ...prev.slice(-(MAX_SOLVES - 1)),
      { ms, penalty: penaltyRef.current, scramble: scrambleRef.current, at: Date.now() },
    ]);
    newScramble();
  };

  const armHold = () => {
    changePhase('holding');
    holdRef.current = setTimeout(() => changePhase('ready'), HOLD_MS);
  };

  const press = () => {
    const p = phaseRef.current;
    if (p === 'running') stopSolve();
    else if (p === 'idle' || p === 'stopped') {
      if (inspectionOnRef.current) startInspection();
      else armHold();
    } else if (p === 'inspecting') armHold();
  };

  // Let go of a hold without starting (back to inspecting, or idle)
  const abortHold = () => {
    clearTimeout(holdRef.current);
    changePhase(inspActiveRef.current ? 'inspecting' : 'idle');
  };

  const release = () => {
    const p = phaseRef.current;
    if (p === 'holding') abortHold();
    else if (p === 'ready') startSolve();
  };

  const cancelHold = () => {
    if (phaseRef.current === 'holding' || phaseRef.current === 'ready') abortHold();
  };

  const cancelInspection = () => {
    clearTimeout(holdRef.current);
    endInspection();
    changePhase('idle');
  };

  const pressRef = useRef(press);
  const releaseRef = useRef(release);
  const cancelInspRef = useRef(cancelInspection);
  pressRef.current = press;
  releaseRef.current = release;
  cancelInspRef.current = cancelInspection;

  useEffect(() => {
    const down = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        pressRef.current();
      } else if (e.code === 'Escape' && inspActiveRef.current) {
        cancelInspRef.current();
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
      cancelAnimationFrame(inspRafRef.current);
    };
  }, []);

  // Last-solve edits
  const togglePenalty = (value) =>
    setSolves((prev) =>
      prev.map((s, i) => (i === prev.length - 1 ? { ...s, penalty: s.penalty === value ? null : value } : s)),
    );
  const deleteSolve = (index) => setSolves((prev) => prev.filter((_, i) => i !== index));
  const clearAll = () => {
    if (window.confirm('Delete all timer solves? This cannot be undone.')) setSolves([]);
  };

  const last = solves[solves.length - 1];

  // What the big display shows
  let display;
  if (inInspection) display = inspectionText(inspMs);
  else if (phase === 'stopped' && last) display = formatSolve(last);
  else display = formatTime(elapsed);

  let hint;
  if (inInspection && inspMs >= 17000) hint = 'Inspection over: this solve will be a DNF';
  else if (inInspection && inspMs >= 15000) hint = 'Over 15s: this solve will get +2';
  else if (inInspection && inspMs >= 12000 && inspMs < 13000) hint = '12 seconds!';
  else if (inInspection && inspMs >= 8000 && inspMs < 9000) hint = '8 seconds!';
  else {
    hint = {
      idle: inspectionOn ? 'Press space (or tap) to start inspection' : 'Hold space (or hold the timer) until it turns green',
      inspecting: 'Hold space (or hold the timer) until it turns green',
      holding: 'Keep holding…',
      ready: 'Release to start',
      running: 'Press any key or tap to stop',
      stopped: inspectionOn ? 'Press for the next inspection' : 'Hold to start the next solve',
    }[phase];
  }

  // Stats (DNF counts as Infinity, so averages handle it the standard way)
  const times = solves.map(effective);
  const finite = times.filter(Number.isFinite);
  const stats = [
    ['Solves', solves.length],
    ['Best', formatTime(best(finite))],
    ['Mean', formatTime(average(finite))],
    ['Ao5', formatTime(ao(times, 5))],
    ['Ao12', formatTime(ao(times, 12))],
    ['Ao100', formatTime(ao(times, 100))],
    ['Best Ao5', formatTime(bestAo(times, 5))],
    ['Best Ao12', formatTime(bestAo(times, 12))],
    ['Best Ao100', formatTime(bestAo(times, 100))],
  ];

  const canChangeScramble = phase === 'idle' || phase === 'stopped';

  const showStats = isMobile && mobileTab === 'stats';

  const statsPanel = (
      <div className="side-col">
        <div className="panel">
          <div className="stats-grid">
            {stats.map(([label, value]) => (
              <div key={label} className="stat">
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {solves.length > 0 && (
          <div className="panel history-panel">
            <div className="history-head">
              <span>Last {Math.min(HISTORY_SHOWN, solves.length)} solves</span>
              <button className="btn" onClick={act(clearAll)}>Clear all</button>
            </div>
            <div className="history">
              {solves
                .map((s, i) => [s, i])
                .slice(-HISTORY_SHOWN)
                .reverse()
                .map(([s, i]) => (
                  <div key={s.at + '-' + i} className="history-row">
                    <span className="n">#{i + 1}</span>
                    <span className="t">{formatSolve(s)}</span>
                    <button
                      className="del"
                      onClick={act(() => deleteSolve(i))}
                      aria-label={`Delete solve ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
  );

  // The whole box is the timer: hold anywhere on it. data-phase drives the colours in CSS
  const timerBox = (
      <div
        className="timer-zone"
        data-phase={phase}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
      >
        {/* Centre: spans the whole box so the time is centred in it. Drawn first so the rest sits on top */}
        <div className="timer-center">
          <div className="time">{display}</div>
          <div className="hint">{hint}</div>
        </div>

        {/* Top: scramble */}
        <div className="panel scramble" onPointerDown={stop} onPointerUp={stop}>
          <p className="scramble-text">{scramble ?? 'Generating scramble…'}</p>
          {canChangeScramble && (
            <button className="btn" onClick={act(newScramble)}>New scramble</button>
          )}
        </div>

        {/* Under the scramble, left: inspection */}
        <label className="check timer-options" onPointerDown={stop} onPointerUp={stop}>
          <input
            type="checkbox"
            checked={inspectionOn}
            onChange={(e) => { setInspectionOn(e.target.checked); e.target.blur(); }}
            disabled={phase !== 'idle' && phase !== 'stopped'}
          />
          Inspection (15s)
        </label>

        {/* Bottom left: penalties */}
        <div className="timer-controls" onPointerDown={stop} onPointerUp={stop}>
          {phase === 'inspecting' && (
            <button className="btn" onClick={act(cancelInspection)}>Cancel inspection</button>
          )}
          {last && phase !== 'running' && !inInspection && (
            <>
              <button className={btnClass(last.penalty === '+2')} onClick={act(() => togglePenalty('+2'))}>+2</button>
              <button className={btnClass(last.penalty === 'DNF')} onClick={act(() => togglePenalty('DNF'))}>DNF</button>
              <button className="btn" onClick={act(() => deleteSolve(solves.length - 1))}>Delete last</button>
            </>
          )}
        </div>

        {/* Bottom right: a Preview button. Press it and it turns into the preview, which has an X to close it */}
        <div className="timer-preview" onPointerDown={stop} onPointerUp={stop}>
          {showPreview ? (
            scramble && (
              <div className="panel preview-box">
                <button className="preview-close" aria-label="Hide preview" onClick={act(() => setShowPreview(false))}>
                  ✕
                </button>
                <twisty-player
                  key={scramble}
                  puzzle="3x3x3"
                  visualization="2D"
                  experimental-setup-alg={scramble}
                  alg=""
                  control-panel="none"
                  background="none"
                ></twisty-player>
              </div>
            )
          ) : (
            <button className="btn" onClick={act(() => setShowPreview(true))}>Preview</button>
          )}
        </div>
      </div>
  );

  return (
    <div className="timer-page">
      {/* Phone only: switch between the timer and its stats */}
      {isMobile && (
        <div className="seg mobile-tabs">
          <button className={btnClass(mobileTab === 'timer')} onClick={act(() => setMobileTab('timer'))}>Timer</button>
          <button
            className={btnClass(mobileTab === 'stats')}
            disabled={!canChangeScramble}
            onClick={act(() => setMobileTab('stats'))}
          >
            Stats
          </button>
        </div>
      )}

      {showStats ? statsPanel : timerBox}

      {/* Bigger screens: stats + history are drawn in the sidebar (portal) */}
      {!isMobile && sideSlot && createPortal(statsPanel, sideSlot)}
    </div>
  );
}
