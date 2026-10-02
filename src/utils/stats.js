// All times are in milliseconds. Every function takes an array of times,
// oldest first, and returns a number or null (not enough solves yet).

const mean = (a) => a.reduce((sum, x) => sum + x, 0) / a.length;

// Average of one window: drop the fastest and slowest, average the rest.
const trimmedMean = (window) => {
  const sorted = [...window].sort((a, b) => a - b);
  return mean(sorted.slice(1, -1));
};

export const best = (t) => (t.length ? Math.min(...t) : null);
export const average = (t) => (t.length ? mean(t) : null);

// Fastest single solve among the last n
export const bestOf = (t, n) => (t.length >= n ? Math.min(...t.slice(-n)) : null);

// Current average of the last n (ao5, ao10, ...)
export const ao = (t, n) => (t.length >= n ? trimmedMean(t.slice(-n)) : null);

// Best average of n across every window of n consecutive solves
export function bestAo(t, n) {
  if (t.length < n) return null;
  let lowest = Infinity;
  for (let i = 0; i + n <= t.length; i++) {
    lowest = Math.min(lowest, trimmedMean(t.slice(i, i + n)));
  }
  return lowest;
}

export function formatTime(ms) {
  if (ms == null) return '—';
  if (ms === Infinity) return 'DNF';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(2);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(2).padStart(5, '0')}`;
}
