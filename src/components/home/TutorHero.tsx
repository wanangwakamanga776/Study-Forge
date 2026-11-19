import { ArrowRight, Sparkles } from 'lucide-react';
import { AnimatedGridPattern, ShimmerButton } from '../animated';

interface TutorHeroProps {
  learnerName?: string;
  hasActiveSession: boolean;
  onAsk: () => void;
  onContinue: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TutorHero({ learnerName = 'Student', hasActiveSession, onAsk, onContinue }: TutorHeroProps) {
  return (
    <section className="sf-card relative overflow-hidden px-6 py-8 sm:px-9 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(680px 320px at 0% 0%, rgba(249,115,22,0.14), transparent 65%), radial-gradient(420px 240px at 85% 10%, rgba(217,119,50,0.10), transparent 70%)',
        }}
      />
      <AnimatedGridPattern
        numSquares={14}
        maxOpacity={0.2}
        duration={5}
        repeatDelay={1.5}
        className="opacity-70 [mask-image:radial-gradient(560px_circle_at_top_left,white,transparent)]"
      />
      <div className="relative max-w-2xl">
        <p className="sf-eyebrow inline-flex items-center gap-2 text-[var(--sf-orange-300)]">
          <Sparkles aria-hidden="true" size={13} />
          AI tutor workspace
        </p>
        <h2 className="sf-display mt-4 text-[clamp(30px,4.2vw,46px)] text-balance">
          {getGreeting()}, {learnerName}.
        </h2>
        <p className="sf-subtitle mt-3">
          What are you learning today? Ask a question, add your notes, or continue a session you already started.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <ShimmerButton
            shimmerColor="#fff7ed"
            shimmerDuration="2.8s"
            className="min-h-12 px-5"
            onClick={hasActiveSession ? onContinue : onAsk}
          >
            {hasActiveSession ? 'Continue learning' : 'Ask the tutor'}
            <ArrowRight aria-hidden="true" size={17} />
          </ShimmerButton>
          <button type="button" className="sf-btn sf-btn-secondary" onClick={onAsk}>
            Create study session
          </button>
        </div>
      </div>
    </section>
  );
}
