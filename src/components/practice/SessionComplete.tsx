import { ArrowRight, Check, Flame, RotateCcw } from 'lucide-react';
import CountUp from '../react-bits/CountUp';
import { PyraMascot } from '../PyraMascot';

interface SessionCompleteProps {
  correct: number;
  total: number;
  xpEarned: number;
  streak?: number;
  onContinue: () => void;
  onReview: () => void;
}

export function SessionComplete({ correct, total, xpEarned, streak = 0, onContinue, onReview }: SessionCompleteProps) {
  const percentage = Math.round((correct / Math.max(total, 1)) * 100);
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-[var(--sf-orange-400)]/25 bg-[linear-gradient(145deg,rgba(249,115,22,0.16),rgba(255,255,255,0.035))] p-8 text-center shadow-[var(--sf-shadow-card)] sm:p-12">
      <div className="mx-auto -mt-2 mb-2 flex justify-center"><PyraMascot expression="excited" className="w-24 h-24" /></div>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sf-orange-500)] text-black shadow-[0_0_35px_var(--sf-orange-glow)]"><Check aria-hidden="true" size={28} /></div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sf-orange-300)]">Session complete</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">You strengthened this topic.</h1>
      <p className="mt-3 text-[var(--sf-text-muted)]">{correct} of {total} correct · {percentage}% understanding check</p>
      <div className="mt-7 flex justify-center gap-8">
        <div><p className="text-3xl font-semibold text-white">+<CountUp from={0} to={xpEarned} duration={0.8} /></p><p className="mt-1 text-xs text-[var(--sf-text-subtle)]">XP earned</p></div>
        <div><p className="inline-flex items-center gap-2 text-3xl font-semibold text-white"><Flame className="text-[var(--sf-orange-400)]" aria-hidden="true" size={24} />{streak}</p><p className="mt-1 text-xs text-[var(--sf-text-subtle)]">day streak</p></div>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={onContinue}>Keep learning <ArrowRight aria-hidden="true" size={18} /></button>
        <button type="button" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={onReview}><RotateCcw aria-hidden="true" size={16} /> Review mistakes</button>
      </div>
    </section>
  );
}
