/**
 * Study Forge 2.0 — pure algorithms (no dependencies).
 * Mirrors blueprint-code/code/algorithms.mjs; tests live in scripts/algorithms.test.ts.
 */

export interface MasteryEvent {
  t: number;
  correct: boolean;
}

export interface StreakState {
  current: number;
  best: number;
  last: string | null;
  freezes: number;
}

export interface CostInputs {
  users: number;
  genPerActive: number;
  activeRate: number;
  cacheHit: number;
  tokIn: number;
  tokOut: number;
  priceInPerM: number;
  priceOutPerM: number;
}

export interface LevelProgress {
  level: number;
  into: number;
  need: number;
}

export function allocateQuestions(weights: Record<string, number>, total: number, minEach = 0): Record<string, number> {
  const keys = Object.keys(weights);
  if (minEach * keys.length > total) throw new Error('total too small for minEach');
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  if (sum <= 0) throw new Error('weights must be positive');
  const spare = total - minEach * keys.length;
  const raw = keys.map((k) => ({ k, x: (weights[k] / sum) * spare }));
  const out: Record<string, number> = Object.fromEntries(raw.map((r) => [r.k, minEach + Math.floor(r.x)]));
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  raw.sort((a, b) => b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)) || a.k.localeCompare(b.k));
  for (let i = 0; left > 0; i++, left--) out[raw[i % raw.length].k]++;
  return out;
}

export function mastery(events: MasteryEvent[], now = Date.now(), halfLifeDays = 14, n0 = 3): number {
  let w = 0;
  let c = 0;
  for (const e of events) {
    const age = Math.max(0, (now - e.t) / 864e5);
    const wt = Math.pow(0.5, age / halfLifeDays);
    w += wt;
    c += wt * (e.correct ? 1 : 0);
  }
  return (c + 0.5 * n0) / (w + n0);
}

export const xpForLevel = (level: number): number => Math.min(400, 80 + 20 * level);

export function levelFromXp(xp: number): LevelProgress {
  let level = 1;
  let rem = Math.max(0, xp);
  while (rem >= xpForLevel(level)) {
    rem -= xpForLevel(level);
    level++;
  }
  return { level, into: rem, need: xpForLevel(level) };
}

export function awardXp(base: number, earnedToday: number, goal: number): number {
  if (earnedToday < goal) return base;
  return Math.max(1, Math.round(base * 0.25));
}

const dayNumber = (value: string): number =>
  Date.UTC(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10)) / 864e5;

export function updateStreak(state: StreakState, today: string): StreakState {
  if (!state.last) return { ...state, current: 1, best: Math.max(state.best, 1), last: today };
  const gap = dayNumber(today) - dayNumber(state.last);
  if (gap <= 0) return state;
  if (gap === 1) {
    return { ...state, current: state.current + 1, best: Math.max(state.best, state.current + 1), last: today };
  }
  if (gap === 2 && state.freezes > 0) {
    return {
      ...state,
      current: state.current + 1,
      best: Math.max(state.best, state.current + 1),
      freezes: state.freezes - 1,
      last: today,
    };
  }
  return { ...state, current: 1, last: today };
}

export function monthlyCost(inputs: CostInputs): { calls: number; usd: number } {
  const { users, genPerActive, activeRate, cacheHit, tokIn, tokOut, priceInPerM, priceOutPerM } = inputs;
  const calls = users * activeRate * genPerActive * (1 - cacheHit);
  const usd = (calls * (tokIn * priceInPerM + tokOut * priceOutPerM)) / 1e6;
  return { calls: Math.round(calls), usd: +usd.toFixed(2) };
}

/** Local-day key (YYYY-MM-DD) used by streaks and quests. */
export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
