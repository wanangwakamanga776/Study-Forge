import { Trophy, Flame, Timer, Layers, BrainCircuit, Zap, Video, Play, Trash2, Activity, Shield, Target, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, ForgeCastBlueprint } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { PYRA_TIPS } from '../constants';
import { PyraMascot } from './PyraMascot';
import { useState, useEffect } from 'react';
import { AboutMeSection } from './AboutMeSection';
import { DailyQuests } from './DailyQuests';
import { ForgeActivityFeed } from './ForgeActivityFeed';
import { ActivistDesk } from './ActivistDesk';
import { FeedbackSection } from './FeedbackSystem';
import { AnnouncementBar } from './AnnouncementBar';
import { TutorHero } from './home/TutorHero';
import { ContinueLearningCard } from './home/ContinueLearningCard';
import { AskTutorComposer } from './tutor/AskTutorComposer';
import { DailyGoalCard } from './progress/DailyGoalCard';
import AnimatedContent from './react-bits/AnimatedContent';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onSelectForgeCast: (fc: ForgeCastBlueprint) => void;
  onDeleteForgeCast: (id: string) => void;
  onOpenForge: () => void;
  isAdmin?: boolean;
  isGuest?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onSelectForgeCast, onDeleteForgeCast, onOpenForge, isAdmin, isGuest }) => {
  const { stats, tasks, forgeCasts } = state;
  const todayTasks = tasks.filter(t => !t.completed);
  const xpToNextLevel = 1000 - (stats.xp % 1000);
  const progress = (stats.xp % 1000) / 10;
  const [activeTip, setActiveTip] = useState(PYRA_TIPS[0]);

  useEffect(() => {
    const interval = setInterval(() => setActiveTip(PYRA_TIPS[Math.floor(Math.random() * PYRA_TIPS.length)]), 15000);
    return () => clearInterval(interval);
  }, []);

  const learnerName = stats.name || stats.studentName || 'Student';
  const hasActiveSession = (state.decks?.length || 0) > 0 || (state.lessons?.length || 0) > 0 || (state.quizzes?.length || 0) > 0;
  const continueTopic = forgeCasts[0]?.metadata?.title || state.lessons?.[0]?.audit_metadata?.title || state.decks?.[0]?.title || 'Your study workspace';
  const continueConcept = hasActiveSession ? `Continue: ${continueTopic}` : 'Start your first study session';
  const dailyMinutesCompleted = Math.min(20, Math.round(((stats.xp % 1000) / 1000) * 20));

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-16 sm:space-y-10">
      <AnnouncementBar />

      <AnimatePresence>
        {isGuest && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 rounded-3xl border border-[var(--sf-orange-400)]/20 bg-[var(--sf-orange-500)]/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]"><Shield size={18} aria-hidden="true" /></span>
              <div>
                <p className="font-medium text-white">Guest mode</p>
                <p className="text-sm text-[var(--sf-text-muted)]">Your progress is saved on this device. Sign in to keep it across devices.</p>
              </div>
            </div>
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-white hover:bg-white/[0.06]">Sign in</button>
          </motion.div>
        )}
      </AnimatePresence>

      <TutorHero
        learnerName={learnerName}
        hasActiveSession={hasActiveSession}
        onAsk={onOpenForge}
        onContinue={() => {
          if (state.decks?.length) onNavigate('flashcards');
          else if (state.quizzes?.length) onNavigate('quiz');
          else if (state.lessons?.length) onNavigate('lessons');
          else onOpenForge();
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <AnimatedContent distance={20} direction="vertical" duration={0.55} initialOpacity={0} animateOpacity>
          <ContinueLearningCard
            topic={hasActiveSession ? 'Your workspace' : 'Get started'}
            concept={continueConcept}
            minutes={8}
            questionsRemaining={hasActiveSession ? Math.max(5, (state.decks?.[0]?.cards?.length || 6)) : 5}
            progress={hasActiveSession ? Math.min(90, Math.max(10, Math.round(progress))) : 0}
            xp={15}
            onContinue={() => {
              if (state.decks?.length) onNavigate('flashcards');
              else if (state.quizzes?.length) onNavigate('quiz');
              else if (state.lessons?.length) onNavigate('lessons');
              else onOpenForge();
            }}
            onReview={() => onNavigate('flashcards')}
          />
        </AnimatedContent>
        <AnimatedContent distance={20} direction="vertical" duration={0.55} delay={0.06} initialOpacity={0} animateOpacity>
          <DailyGoalCard minutesCompleted={dailyMinutesCompleted} minutesGoal={20} streak={stats.streak || 0} />
        </AnimatedContent>
      </div>

      <AnimatedContent distance={20} direction="vertical" duration={0.55} delay={0.1} initialOpacity={0} animateOpacity>
        <AskTutorComposer onSubmit={() => onOpenForge()} />
      </AnimatedContent>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><Trophy size={20} aria-hidden="true" /></span>
            <span className="text-xs font-medium text-[var(--sf-text-subtle)]">Level {stats.level}</span>
          </div>
          <p className="text-2xl font-semibold text-white">{stats.xp} <span className="text-sm font-normal text-[var(--sf-text-subtle)]">XP</span></p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="XP to next level">
            <div className="h-full rounded-full bg-[var(--sf-orange-500)]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-[var(--sf-text-subtle)]">{xpToNextLevel} XP to next level</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-orange-500/12 text-[var(--sf-orange-300)]"><Flame size={20} aria-hidden="true" /></span>
          <p className="text-2xl font-semibold text-white">{stats.streak || 0} <span className="text-sm font-normal text-[var(--sf-text-subtle)]">days</span></p>
          <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">Study streak</p>
        </div>
        <div className="col-span-2 rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sf-text-subtle)]"><Sparkles size={15} className="text-[var(--sf-orange-400)]" aria-hidden="true" /> Study tip</div>
          <AnimatePresence mode="wait">
            <motion.p key={activeTip} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm leading-7 text-[var(--sf-text-muted)] sm:text-base">{activeTip}</motion.p>
          </AnimatePresence>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Quick start</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: <Timer size={22} />, label: 'Focus', view: 'timer' },
            { icon: <Layers size={22} />, label: 'Flashcards', view: 'flashcards' },
            { icon: <Zap size={22} />, label: 'Match', view: 'match' },
            { icon: <BrainCircuit size={22} />, label: 'Quiz', view: 'quiz' },
            { icon: <Video size={22} />, label: 'Library', view: 'forge-library' },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => onNavigate(item.view)} className="group flex min-h-[104px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-4 text-[var(--sf-text-muted)] transition hover:border-[var(--sf-orange-400)]/25 hover:text-white hover:bg-[var(--sf-surface-raised)]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.04] text-[var(--sf-orange-300)] group-hover:bg-[var(--sf-orange-500)]/15">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'var(--sf-font-display)' }}>Recent lessons</h2>
              <p className="mt-1 text-sm text-[var(--sf-text-subtle)]">Pick up where you left off.</p>
            </div>
            <button type="button" onClick={() => onNavigate('forge-library')} className="min-h-10 rounded-xl border border-white/10 px-4 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.06] hover:text-white">View all</button>
          </div>
          {forgeCasts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {forgeCasts.slice(0, 4).map((fc) => (
                <div key={fc.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <button type="button" className="block w-full text-left" onClick={() => { onSelectForgeCast(fc); onNavigate('forge-player'); soundService.playClick(); }}>
                    <div className="relative aspect-video">
                      <img src={`https://picsum.photos/seed/${encodeURIComponent(fc.metadata.title)}/800/450`} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-[var(--sf-orange-500)] text-black"><Play size={16} fill="currentColor" className="ml-0.5" aria-hidden="true" /></span>
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-semibold text-white">{fc.metadata.title}</p>
                      <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">{fc.chapters.length} modules · {fc.metadata.estimated_duration}s</p>
                    </div>
                  </button>
                  <button type="button" aria-label="Delete lesson" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this lesson?')) onDeleteForgeCast(fc.id); }} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-red-300 opacity-0 backdrop-blur transition hover:bg-red-500 hover:text-white group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <Video size={36} className="mx-auto mb-3 text-white/30" aria-hidden="true" />
              <p className="font-medium text-white">No lessons yet</p>
              <p className="mt-1 text-sm text-[var(--sf-text-subtle)]">Create a study session to build your library.</p>
              <button type="button" onClick={onOpenForge} className="mt-5 min-h-11 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black">Create session</button>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Study plan</h2>
                <p className="text-sm text-[var(--sf-text-subtle)]">Tasks for today</p>
              </div>
              <button type="button" onClick={() => onNavigate('planner')} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[var(--sf-text-muted)] hover:text-white" aria-label="Open planner"><Target size={18} /></button>
            </div>
            {todayTasks.length > 0 ? (
              <div className="space-y-3">
                {todayTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3">
                    <span className={cn('h-2 w-2 rounded-full', task.priority === 'Urgent' ? 'bg-red-500' : task.priority === 'High' ? 'bg-orange-500' : task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-emerald-500')} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/90">{task.title}</p>
                      <p className="text-xs text-[var(--sf-text-subtle)]">{task.priority} priority</p>
                    </div>
                    <span className="text-xs text-[var(--sf-text-subtle)]">{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
                <button type="button" onClick={() => onNavigate('planner')} className="min-h-11 w-full rounded-xl border border-white/10 text-sm text-[var(--sf-text-muted)] hover:text-white hover:bg-white/[0.05]">View planner</button>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-[var(--sf-text-muted)]">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={22} aria-hidden="true" /> All tasks complete.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 text-center">
            <div className="mx-auto mb-3 w-fit"><PyraMascot expression="happy" className="w-16 h-16" /></div>
            <p className="text-sm leading-6 text-[var(--sf-text-muted)]">Ask a question, create a session, or review what you’ve learned.</p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6">
            <div className="mb-4 flex items-center gap-2 text-white"><Activity size={18} className="text-[var(--sf-orange-400)]" aria-hidden="true" /><h2 className="text-lg font-semibold">Recent activity</h2></div>
            <ForgeActivityFeed />
          </section>
        </div>
      </div>

      <ActivistDesk />
      <div className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5 sm:p-6"><DailyQuests /></div>

      <div className="space-y-10 border-t border-white/10 pt-10">
        <FeedbackSection />
        <AboutMeSection />
      </div>
    </div>
  );
};