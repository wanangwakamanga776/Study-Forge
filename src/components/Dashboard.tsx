import { Trophy, Flame, Timer, Layers, BrainCircuit, Zap, Video, Play, Trash2, Target, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { AppState, ForgeCastBlueprint } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { PYRA_TIPS } from '../constants';
import { AnnouncementBar } from './AnnouncementBar';
import { TutorHero } from './home/TutorHero';
import { ContinueLearningCard } from './home/ContinueLearningCard';
import { AskTutorComposer } from './tutor/AskTutorComposer';
import { DailyGoalCard } from './progress/DailyGoalCard';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onSelectForgeCast: (fc: ForgeCastBlueprint) => void;
  onDeleteForgeCast: (id: string) => void;
  onOpenForge: () => void;
  isAdmin?: boolean;
  isGuest?: boolean;
}

const quickStart = [
  { icon: Timer, label: 'Focus', hint: 'A quiet timer', view: 'timer' },
  { icon: Layers, label: 'Flashcards', hint: 'Recall practice', view: 'flashcards' },
  { icon: Zap, label: 'Match', hint: 'Quick game', view: 'match' },
  { icon: BrainCircuit, label: 'Quiz', hint: 'Check yourself', view: 'quiz' },
  { icon: Video, label: 'Library', hint: 'Your lessons', view: 'forge-library' },
];

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onSelectForgeCast, onDeleteForgeCast, onOpenForge, isGuest }) => {
  const { stats, tasks, forgeCasts } = state;
  const todayTasks = tasks.filter(t => !t.completed);
  const xpToNextLevel = 1000 - (stats.xp % 1000);
  const progress = (stats.xp % 1000) / 10;

  const learnerName = stats.name || stats.studentName || 'Student';
  const hasActiveSession = (state.decks?.length || 0) > 0 || (state.lessons?.length || 0) > 0 || (state.quizzes?.length || 0) > 0;
  const continueTopic = forgeCasts[0]?.metadata?.title || state.lessons?.[0]?.audit_metadata?.title || state.decks?.[0]?.title || 'Your study workspace';
  const continueConcept = hasActiveSession ? `Continue: ${continueTopic}` : 'Start your first study session';
  const dailyMinutesCompleted = Math.min(20, Math.round(((stats.xp % 1000) / 1000) * 20));

  const openContinue = () => {
    if (state.decks?.length) onNavigate('flashcards');
    else if (state.quizzes?.length) onNavigate('quiz');
    else if (state.lessons?.length) onNavigate('lessons');
    else onOpenForge();
  };

  return (
    <div className="space-y-7">
      <AnnouncementBar />

      {isGuest && (
        <div className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--sf-orange-400)]/20 bg-[var(--sf-orange-500)]/[0.07] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--sf-orange-500)]/14 text-[var(--sf-orange-300)]"><Shield size={16} aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-medium text-white">Guest mode</p>
              <p className="text-[13px] text-[var(--sf-text-muted)]">Progress is saved on this device. Sign in to keep it across devices.</p>
            </div>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="sf-btn sf-btn-secondary min-h-9 px-3 text-[13px]">
            Sign in
          </button>
        </div>
      )}

      <TutorHero learnerName={learnerName} hasActiveSession={hasActiveSession} onAsk={onOpenForge} onContinue={openContinue} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <ContinueLearningCard
          topic={hasActiveSession ? 'Your workspace' : 'Get started'}
          concept={continueConcept}
          minutes={8}
          questionsRemaining={hasActiveSession ? Math.max(5, (state.decks?.[0]?.cards?.length || 6)) : 5}
          progress={hasActiveSession ? Math.min(90, Math.max(10, Math.round(progress))) : 0}
          xp={15}
          onContinue={openContinue}
          onReview={() => onNavigate('flashcards')}
        />
        <DailyGoalCard minutesCompleted={dailyMinutesCompleted} minutesGoal={20} streak={stats.streak || 0} />
      </div>

      <AskTutorComposer
        onSubmit={() => onOpenForge()}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <section className="sf-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="sf-card-title">Your learning snapshot</h2>
            <span className="text-xs text-[var(--sf-text-subtle)]">Level {stats.level}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="sf-card-quiet p-4">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Trophy size={16} aria-hidden="true" /></span>
              <p className="mt-3 text-lg font-semibold text-white">{stats.xp} <span className="text-xs font-normal text-[var(--sf-text-subtle)]">XP</span></p>
              <p className="mt-1 text-[11.5px] text-[var(--sf-text-subtle)]">{xpToNextLevel} XP to next level</p>
            </div>
            <div className="sf-card-quiet p-4">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Flame size={16} aria-hidden="true" /></span>
              <p className="mt-3 text-lg font-semibold text-white">{stats.streak || 0} <span className="text-xs font-normal text-[var(--sf-text-subtle)]">days</span></p>
              <p className="mt-1 text-[11.5px] text-[var(--sf-text-subtle)]">Study streak</p>
            </div>
            <div className="sf-card-quiet col-span-2 p-4 sm:col-span-1">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Target size={16} aria-hidden="true" /></span>
              <p className="mt-3 text-lg font-semibold text-white">{todayTasks.length}</p>
              <p className="mt-1 text-[11.5px] text-[var(--sf-text-subtle)]">Tasks left today</p>
            </div>
          </div>
        </section>

        <section className="sf-card flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="sf-eyebrow flex items-center gap-2"><Sparkles size={13} className="text-[var(--sf-orange-400)]" aria-hidden="true" /> Study tip</p>
            <p className="mt-3 text-[13.5px] leading-6 text-[var(--sf-text-muted)]">{PYRA_TIPS[0]}</p>
          </div>
          <button type="button" onClick={() => onNavigate('progress')} className="sf-btn sf-btn-ghost self-start px-0 text-[13px] text-[var(--sf-orange-300)]">
            See your progress
          </button>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="sf-card-title">Quick start</h2>
          <span className="text-xs text-[var(--sf-text-subtle)]">Jump into a tool</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {quickStart.map(({ icon: Icon, label, hint, view }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(view)}
              className="sf-card sf-card-interactive flex min-h-[72px] items-center gap-3 p-4 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--sf-orange-500)]/10 text-[var(--sf-orange-300)]">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-white">{label}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[var(--sf-text-subtle)]">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section className="sf-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="sf-card-title">Recent lessons</h2>
              <p className="mt-0.5 text-[12.5px] text-[var(--sf-text-subtle)]">Pick up where you left off.</p>
            </div>
            <button type="button" onClick={() => onNavigate('forge-library')} className="sf-btn sf-btn-ghost min-h-9 text-[13px]">View all</button>
          </div>
          {forgeCasts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {forgeCasts.slice(0, 4).map((fc, index) => (
                <div key={fc.id} className="group relative overflow-hidden rounded-[14px] border border-[var(--sf-border)] bg-white/[0.02]">
                  <button type="button" className="block w-full text-left" onClick={() => { onSelectForgeCast(fc); onNavigate('forge-player'); soundService.playClick(); }}>
                    <div className="relative flex h-24 items-center justify-center overflow-hidden border-b border-[var(--sf-border)]">
                      <div aria-hidden="true" className={cn('absolute inset-0 opacity-80', index % 3 === 0 ? 'bg-[radial-gradient(120%_120%_at_20%_0%,rgba(249,115,22,0.22),transparent_60%)]' : index % 3 === 1 ? 'bg-[radial-gradient(120%_120%_at_80%_10%,rgba(217,119,50,0.20),transparent_60%)]' : 'bg-[radial-gradient(120%_120%_at_50%_0%,rgba(253,186,116,0.16),transparent_60%)]')} />
                      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-[var(--sf-orange-500)] text-[#1a1209]"><Play size={15} fill="currentColor" className="ml-0.5" aria-hidden="true" /></span>
                    </div>
                    <div className="p-4">
                      <p className="truncate text-[13.5px] font-semibold text-white">{fc.metadata.title}</p>
                      <p className="mt-1 text-[11.5px] text-[var(--sf-text-subtle)]">{fc.chapters.length} modules &middot; {fc.metadata.estimated_duration}s</p>
                    </div>
                  </button>
                  <button type="button" aria-label="Delete lesson" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this lesson?')) onDeleteForgeCast(fc.id); }} className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-lg bg-black/50 text-red-300 opacity-0 backdrop-blur transition hover:bg-red-500 hover:text-white group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-[var(--sf-border)] px-6 py-10 text-center">
              <Video size={30} className="mx-auto mb-3 text-white/25" aria-hidden="true" />
              <p className="text-sm font-medium text-white">No lessons yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-[var(--sf-text-subtle)]">Create a study session and it will appear here, ready to resume.</p>
              <button type="button" onClick={onOpenForge} className="sf-btn sf-btn-primary mt-5">Create session</button>
            </div>
          )}
        </section>

        <section className="sf-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="sf-card-title">Study plan</h2>
              <p className="mt-0.5 text-[12.5px] text-[var(--sf-text-subtle)]">Tasks for today</p>
            </div>
            <button type="button" onClick={() => onNavigate('planner')} className="sf-icon-btn h-9 w-9" aria-label="Open planner"><Target size={16} /></button>
          </div>
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--sf-border)] bg-white/[0.02] px-3 py-2.5">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', task.priority === 'Urgent' ? 'bg-red-400' : task.priority === 'High' ? 'bg-orange-400' : task.priority === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-white/90">{task.title}</p>
                    <p className="text-[11px] text-[var(--sf-text-subtle)]">{task.priority} priority</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--sf-text-subtle)]">{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
              <button type="button" onClick={() => onNavigate('planner')} className="sf-btn sf-btn-secondary mt-2 w-full">Open planner</button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={22} aria-hidden="true" />
              <p className="text-[13px] text-[var(--sf-text-muted)]">All tasks complete for today.</p>
              <button type="button" onClick={() => onNavigate('planner')} className="sf-btn sf-btn-secondary mt-4 w-full">Plan tomorrow</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
