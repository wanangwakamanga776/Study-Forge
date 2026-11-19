import assert from 'node:assert/strict';
import * as A from '../src/lib/algorithms';

const w = { Algebra: 40, Geometry: 25, Stats: 20, Calculus: 15 };
const a = A.allocateQuestions(w, 15, 1);
assert.equal(Object.values(a).reduce((x, y) => x + y, 0), 15);
assert.ok(Object.values(a).every((v) => v >= 1));
assert.deepEqual(a, { Algebra: 5, Geometry: 4, Stats: 3, Calculus: 3 });
assert.equal(Object.values(A.allocateQuestions({ a: 1, b: 1, c: 1 }, 10)).reduce((x, y) => x + y, 0), 10);
assert.throws(() => A.allocateQuestions(w, 3, 1));
for (let i = 0; i < 500; i++) {
  const k = 2 + (i % 7);
  const ws: Record<string, number> = {};
  for (let j = 0; j < k; j++) ws['t' + j] = 1 + ((i * 31 + j * 17) % 50);
  const tot = k + (i % 40);
  const r = A.allocateQuestions(ws, tot, 1);
  assert.equal(Object.values(r).reduce((x, y) => x + y, 0), tot);
}

const now = Date.UTC(2026, 10, 19);
assert.equal(A.mastery([]), 0.5);
assert.equal(A.mastery([], now), 0.5);
const good = Array.from({ length: 10 }, (_, i) => ({ t: now - i * 864e5, correct: true }));
const bad = good.map((e) => ({ ...e, correct: false }));
assert.ok(A.mastery(good, now) > 0.8 && A.mastery(bad, now) < 0.2);
assert.ok(A.mastery([{ t: now, correct: true }], now) < 0.7);
const old = good.map((e) => ({ ...e, t: e.t - 120 * 864e5 }));
assert.ok(A.mastery(old, now) < A.mastery(good, now));

assert.deepEqual(A.levelFromXp(0), { level: 1, into: 0, need: 100 });
assert.equal(A.levelFromXp(100).level, 2);
assert.equal(A.levelFromXp(220).level, 3);
assert.equal(A.xpForLevel(100), 400);
assert.equal(A.awardXp(10, 10, 30), 10);
assert.equal(A.awardXp(10, 30, 30), 3);

type S = A.StreakState;
let s: S = { current: 0, best: 0, last: null, freezes: 1 };
s = A.updateStreak(s, '2026-11-01');
s = A.updateStreak(s, '2026-11-02');
assert.equal(s.current, 2);
s = A.updateStreak(s, '2026-11-04');
assert.deepEqual([s.current, s.freezes], [3, 0]);
s = A.updateStreak(s, '2026-11-07');
assert.equal(s.current, 1);
assert.equal(s.best, 3);
assert.equal(A.updateStreak(s, '2026-11-07'), s);
assert.equal(A.updateStreak({ current: 5, best: 5, last: '2026-02-28', freezes: 0 }, '2026-03-01').current, 6);
assert.equal(A.updateStreak({ current: 5, best: 5, last: '2028-02-28', freezes: 0 }, '2028-03-01').current, 1);
assert.equal(A.updateStreak({ current: 5, best: 5, last: '2028-02-28', freezes: 0 }, '2028-03-01').best, 5);
assert.equal(A.updateStreak({ current: 5, best: 5, last: '2026-12-31', freezes: 0 }, '2027-01-01').current, 6);

const c = A.monthlyCost({ users: 5000, genPerActive: 6, activeRate: 0.4, cacheHit: 0.5, tokIn: 4000, tokOut: 1500, priceInPerM: 0.3, priceOutPerM: 2.5 });
assert.equal(c.calls, 6000);
assert.equal(c.usd, +(6000 * (4000 * 0.3 + 1500 * 2.5) / 1e6).toFixed(2));
assert.match(A.localDayKey(new Date(2026, 10, 19)), /^2026-11-19$/);

console.log('all algorithm tests passed', JSON.stringify({ alloc: a, cost: c }));
