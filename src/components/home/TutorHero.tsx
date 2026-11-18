import { ArrowRight, Sparkles } from 'lucide-react';
import Aurora from '../react-bits/Aurora';
import BlurText from '../react-bits/BlurText';
import { usePrefersReducedMotion } from '../../lib/motion';

interface TutorHeroProps {
  learnerName?: string;
  hasActiveSession: boolean;
  onAsk: () => void;
  onContinue: () => void;
}

export function TutorHero({ learnerName = 'Student', hasActiveSession, onAsk, onContinue }: TutorHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <section className="sf-noise relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111116] px-6 py-8 shadow-[var(--sf-shadow-card)] sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64" aria-hidden="true">
        <Aurora
          colorStops={['#7c2d12', '#f97316', '#fed7aa']}
          speed={0.35}
          opacity={reducedMotion ? 0.25 : 0.6}
          paused={reducedMotion}
        />
      </div>

      <div className="relative max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--sf-orange-300)]/20 bg-[var(--sf-orange-500)]/10 px-3 py-1.5 text-xs font-medium text-[var(--sf-orange-300)]">
          <Sparkles aria-hidden="true" size={14} />
          <span>AI tutor workspace</span>
        </div>
        <BlurText
          text={`What are you learning today, ${learnerName}?`}
          animateBy="words"
          direction="top"
          delay={60}
          className="sf-text-balance max-w-2xl font-[var(--sf-font-display)] text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
        />
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--sf-text-muted)] sm:text-lg">
          Ask a question, add your notes, or continue a study session. Study Forge helps you understand, practice, and review what matters.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black shadow-[0_0_28px_var(--sf-orange-glow)] transition hover:bg-[var(--sf-orange-400)] active:translate-y-px"
            onClick={hasActiveSession ? onContinue : onAsk}
          >
            {hasActiveSession ? 'Continue learning' : 'Ask the tutor'}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 font-medium text-white transition hover:bg-white/[0.09]"
            onClick={onAsk}
          >
            Create study session
          </button>
        </div>
      </div>
    </section>
  );
}
