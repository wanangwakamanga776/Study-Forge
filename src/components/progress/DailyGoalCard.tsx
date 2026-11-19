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
    <section className="sf-card h-full p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="sf-eyebrow">Today&rsquo;s goal</p>
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]">
          <Flame aria-hidden="true" size={18} />
        </span>
      </div>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="sf-stat-value"><CountUp from={0} to={minutesCompleted} duration={0.8} /></span>
        <span className="text-sm text-[var(--sf-text-subtle)]">/ {minutesGoal} min</span>
      </p>

      <div className="sf-progress mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label="Daily study goal">
        <span style={{ width: `${percentage}%` }} />
      </div>

      <p className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-[var(--sf-text-muted)]">
        {done ? <Check className="mt-0.5 shrink-0 text-[var(--sf-success)]" aria-hidden="true" size={15} /> : <Clock3 className="mt-0.5 shrink-0" aria-hidden="true" size={15} />}
        {done ? 'Daily goal complete. Nice work.' : `${Math.max(minutesGoal - minutesCompleted, 0)} minutes left today.`}
      </p>

      <div className="mt-5 border-t border-[var(--sf-border)] pt-4">
        <p className="text-[13px] text-[var(--sf-text-subtle)]">
          <span className="font-semibold text-white">{streak} day{streak === 1 ? '' : 's'}</span> in your streak
        </p>
      </div>
    </section>
  );
}
