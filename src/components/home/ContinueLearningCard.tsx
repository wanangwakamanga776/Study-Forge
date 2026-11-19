import { ArrowRight, BookOpen, Clock3, Flame, RotateCcw } from 'lucide-react';
import { BorderBeam } from '../animated';

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
    <section className="sf-card h-full overflow-hidden">
      <BorderBeam size={200} duration={13} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(145deg, rgba(249,115,22,0.13), transparent 58%)' }}
      />
      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--sf-orange-500)] text-[#1a1209]">
              <BookOpen aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="sf-eyebrow text-[var(--sf-orange-300)]">Recommended next</p>
              <p className="mt-1 text-[13px] text-[var(--sf-text-subtle)]">{topic}</p>
            </div>
          </div>
          <span className="sf-chip sf-chip-accent">
            <Flame aria-hidden="true" size={13} /> +{xp} XP
          </span>
        </div>

        <h2 className="sf-display mt-6 text-[26px] leading-tight sm:text-[30px]">{concept}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--sf-text-muted)]">
          <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={15} />{minutes} minutes</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen aria-hidden="true" size={15} />{questionsRemaining} items</span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[var(--sf-text-subtle)]">Session progress</span>
            <span className="font-semibold text-white">{progress}%</span>
          </div>
          <div className="sf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Session progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" className="sf-btn sf-btn-primary sm:flex-1" onClick={onContinue}>
            Continue <ArrowRight aria-hidden="true" size={16} />
          </button>
          <button type="button" className="sf-btn sf-btn-secondary" onClick={onReview}>
            <RotateCcw aria-hidden="true" size={15} /> Review
          </button>
        </div>
      </div>
    </section>
  );
}
