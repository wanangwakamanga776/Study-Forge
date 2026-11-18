import { Flame, Target, Trophy, Zap } from 'lucide-react';
import { AppState } from '../types';
import { DailyGoalCard } from '../components/progress/DailyGoalCard';
import { PyraMascot } from '../components/PyraMascot';
import CountUp from '../components/react-bits/CountUp';

interface ProgressPageProps {
  state: AppState;
}

export function ProgressPage({ state }: ProgressPageProps) {
  const { stats } = state;
  const xp = stats.xp || 0;
  const level = stats.level || 1;
  const streak = stats.streak || 0;
  const progress = (xp % 1000) / 10;
  const dailyMinutesCompleted = Math.min(20, Math.round((xp % 1000) / 1000) * 20);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PyraMascot expression={streak > 0 ? 'excited' : 'happy'} className="w-14 h-14" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-orange-300)]">Progress</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">See how you’re growing</h1>
              <p className="mt-2 text-[var(--sf-text-muted)]">Track study habits, streaks, and mastery over time.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--sf-orange-500)]/15 px-4 py-2 text-sm font-semibold text-[var(--sf-orange-300)]">
            <Trophy aria-hidden="true" size={16} /> Level {level}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Experience</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Learning momentum</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]"><Zap aria-hidden="true" size={20} /></span>
          </div>
          <p className="mt-6 text-4xl font-semibold text-white"><CountUp from={0} to={xp} duration={1} /> <span className="text-base font-normal text-[var(--sf-text-subtle)]">XP</span></p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Level progress">
            <div className="h-full rounded-full bg-[var(--sf-orange-500)] transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-[var(--sf-text-muted)]">{1000 - (xp % 1000)} XP to level {level + 1}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--sf-orange-300)]"><Flame aria-hidden="true" size={16} /> Streak</div>
              <p className="mt-2 text-2xl font-semibold text-white">{streak}</p>
              <p className="text-xs text-[var(--sf-text-subtle)]">days</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--sf-orange-300)]"><Target aria-hidden="true" size={16} /> Tasks</div>
              <p className="mt-2 text-2xl font-semibold text-white">{(state.tasks || []).filter(t => t.completed).length}</p>
              <p className="text-xs text-[var(--sf-text-subtle)]">completed</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-[var(--sf-orange-300)]"><Trophy aria-hidden="true" size={16} /> Lessons</div>
              <p className="mt-2 text-2xl font-semibold text-white">{(state.lessons || []).length}</p>
              <p className="text-xs text-[var(--sf-text-subtle)]">saved</p>
            </div>
          </div>
        </section>

        <DailyGoalCard minutesCompleted={dailyMinutesCompleted} minutesGoal={20} streak={streak} />
      </div>
    </div>
  );
}
