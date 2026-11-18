import { Check, Clock3, Flame } from 'lucide-react';
import CountUp from '../react-bits/CountUp';

interface DailyGoalCardProps {
  minutesCompleted: number;
  minutesGoal: number;
  streak: number;
}

export function DailyGoalCard({ minutesCompleted, minutesGoal, streak }: DailyGoalCardProps) {
  const percentage = Math.min(100, Math.round((minutesCompleted / Math.max(minutesGoal, 1)) * 100));
  const done = percentage >= 100;

  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Today’s goal</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Keep your learning streak alive</h2>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]">
          <Flame aria-hidden="true" size={20} />
        </span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold text-white">
          <CountUp from={0} to={minutesCompleted} duration={0.8} /> <span className="text-base font-normal text-[var(--sf-text-subtle)]">/ {minutesGoal} min</span>
        </p>
        <p className="text-sm text-[var(--sf-text-muted)]">{streak} day streak</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label="Daily study goal">
        <div className="h-full rounded-full bg-[var(--sf-orange-500)] transition-[width] duration-700" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-[var(--sf-text-muted)]">
        {done ? <Check className="text-[var(--sf-success)]" aria-hidden="true" size={16} /> : <Clock3 aria-hidden="true" size={16} />}
        {done ? 'Daily goal complete. Nice work.' : `${Math.max(minutesGoal - minutesCompleted, 0)} minutes left today.`}
      </p>
    </section>
  );
}
