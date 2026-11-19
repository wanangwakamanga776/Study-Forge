import { Flame, Target, Trophy, Zap } from 'lucide-react';
import { AppState } from '../types';
import { DailyGoalCard } from '../components/progress/DailyGoalCard';
import { DailyQuests } from '../components/DailyQuests';
import { PageHeader } from '../components/layout/PageHeader';
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
      <PageHeader
        title="See how you are growing"
        description="Effort, consistency, and mastery — tracked without inflating the numbers."
        action={
          <span className="sf-chip sf-chip-accent px-3 py-1.5 text-[13px]">
            <Trophy aria-hidden="true" size={14} /> Level {level}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="sf-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="sf-eyebrow">Experience</p>
              <h2 className="sf-card-title mt-2">Learning momentum</h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Zap aria-hidden="true" size={18} /></span>
          </div>

          <p className="mt-6 flex items-baseline gap-2">
            <span className="sf-stat-value text-[38px]"><CountUp from={0} to={xp} duration={1} /></span>
            <span className="text-sm text-[var(--sf-text-subtle)]">XP</span>
          </p>

          <div className="sf-progress mt-4 h-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Level progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2.5 text-[12.5px] text-[var(--sf-text-muted)]">{1000 - (xp % 1000)} XP to level {level + 1}</p>

          <div className="sf-divider my-6" />

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flame, label: 'Streak', value: streak, hint: 'days' },
              { icon: Target, label: 'Tasks', value: (state.tasks || []).filter(t => t.completed).length, hint: 'completed' },
              { icon: Trophy, label: 'Lessons', value: (state.lessons || []).length, hint: 'saved' },
            ].map(({ icon: Icon, label, value, hint }) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 text-[var(--sf-orange-300)]"><Icon aria-hidden="true" size={14} /><span className="text-[11.5px] font-medium">{label}</span></div>
                <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
                <p className="text-[11px] text-[var(--sf-text-subtle)]">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        <DailyGoalCard minutesCompleted={dailyMinutesCompleted} minutesGoal={20} streak={streak} />
      </div>

      <DailyQuests />

      <section className="sf-card p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="sf-eyebrow">Study trail</p>
            <h2 className="sf-card-title mt-2">Recent materials</h2>
          </div>
          <p className="text-[12.5px] text-[var(--sf-text-subtle)]">What you have opened recently</p>
        </div>

        {(state.lessons || []).length > 0 || (state.decks || []).length > 0 ? (
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {(state.lessons || []).slice(0, 6).map((lesson: any) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--sf-border)] bg-white/[0.02] px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-white">{lesson.audit_metadata?.title || 'Lesson'}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--sf-text-subtle)]">{lesson.audit_metadata?.level_detected || 'Lesson'}</span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--sf-text-subtle)]">{lesson.completed_sessions_count || 0} sessions</span>
              </li>
            ))}
            {(state.decks || []).slice(0, 6).map((deck: any) => (
              <li key={deck.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--sf-border)] bg-white/[0.02] px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-white">{deck.title || 'Flashcard deck'}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--sf-text-subtle)]">Flashcards</span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--sf-text-subtle)]">{deck.cards?.length || 0} cards</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-[12px] border border-dashed border-[var(--sf-border)] px-5 py-8 text-center text-[13px] text-[var(--sf-text-subtle)]">
            Your lessons, decks, and completed sessions will show here once you start studying.
          </p>
        )}
      </section>
    </div>
  );
}
