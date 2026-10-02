import { Alg } from 'cubing/alg';
import { randomScrambleForEvent } from 'cubing/scramble';

const AUF = ['', 'U', "U'", 'U2'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Picks a random case from `pool` (never the same as lastId unless it's the
// only one) and adds random AUFs. OLL only gets a pre-AUF, because a post-AUF
// doesn't change an OLL case.
export function makeCase(pool, lastId) {
  if (pool.length === 0) return null;

  const options = pool.length > 1 ? pool.filter((a) => a.id !== lastId) : pool;
  const alg = pick(options);

  const pre = pick(AUF);
  const post = alg.category === 'PLL' ? pick(AUF) : '';

  // What the solver will perform:
  const solution = [pre, alg.alg, post].filter(Boolean).join(' ');
  // What you do to a solved cube (yellow top, green front) to set the case up:
  const scramble = new Alg(solution).invert().toString();

  return { alg, pre, post, solution, scramble };
}

// Simple random-move scramble, used only if the official generator fails
function fallbackScramble(length = 20) {
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
  const axis = (f) => 'UD'.includes(f) ? 0 : 'RL'.includes(f) ? 1 : 2;
  const moves = [];
  while (moves.length < length) {
    const f = pick(faces);
    const last = moves[moves.length - 1];
    const secondLast = moves[moves.length - 2];
    if (last && f === last[0]) continue;
    if (last && secondLast && axis(f) === axis(last[0]) && secondLast[0] === f) continue;
    moves.push(f + pick(['', "'", '2']));
  }
  return moves.join(' ');
}

// Random-state 3x3 scramble (like a real competition scramble).
// The first call takes a moment while the solver loads.
export async function generate3x3Scramble() {
  try {
    return (await randomScrambleForEvent('333')).toString();
  } catch (err) {
    console.warn('Official scramble generator failed, using fallback:', err);
    return fallbackScramble();
  }
}
