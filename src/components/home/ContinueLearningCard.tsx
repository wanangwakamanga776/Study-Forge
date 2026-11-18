import { ArrowRight, BookOpen, Clock3, Flame, RotateCcw } from 'lucide-react';
import SpotlightCard from '../react-bits/SpotlightCard';

interface ContinueLearningCardProps {
  topic: string;
  concept: string;
  minutes: number;
  questionsRemaining: number;
  progress: number;
  xp: number;
  onContinue: () => void;
  onReview: () => void;
}

export function ContinueLearningCard({ topic, concept, minutes, questionsRemaining, progress, xp, onContinue, onReview }: ContinueLearningCardProps) {
  return (
    <SpotlightCard className="h-full rounded-3xl border border-[var(--sf-orange-400)]/25 bg-[linear-gradient(140deg,rgba(249,115,22,0.16),rgba(255,255,255,0.035))] p-6" spotlightColor="rgba(249, 115, 22, 0.18)">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--sf-orange-500)] text-black">
            <BookOpen aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-orange-300)]">Recommended next</p>
            <p className="mt-1 text-sm text-[var(--sf-text-subtle)]">{topic}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sf-orange-500)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--sf-orange-300)]">
          <Flame aria-hidden="true" size={13} /> +{xp} XP
        </span>
      </div>

      <h2 className="mt-7 max-w-md text-2xl font-semibold tracking-tight text-white">{concept}</h2>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--sf-text-muted)]">
        <span className="inline-flex items-center gap-2"><Clock3 aria-hidden="true" size={16} />{minutes} minutes</span>
        <span className="inline-flex items-center gap-2"><BookOpen aria-hidden="true" size={16} />{questionsRemaining} items</span>
      </div>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[var(--sf-text-subtle)]">Session progress</span>
          <span className="font-semibold text-white">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Session progress">
          <div className="h-full rounded-full bg-[var(--sf-orange-400)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={onContinue}>
          Continue <ArrowRight aria-hidden="true" size={17} />
        </button>
        <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={onReview}>
          <RotateCcw aria-hidden="true" size={16} /> Review
        </button>
      </div>
    </SpotlightCard>
  );
}
