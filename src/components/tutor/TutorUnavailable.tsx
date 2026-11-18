import { PyraMascot } from '../PyraMascot';

export function TutorUnavailable({ onRetry, onReview }: { onRetry: () => void; onReview: () => void }) {
  return (
    <div className="rounded-3xl border border-[var(--sf-danger)]/25 bg-[var(--sf-danger-soft)] p-6" role="alert">
      <div className="flex items-start gap-4">
        <PyraMascot expression="thinking" className="w-12 h-12 shrink-0" />
        <div>
          <h2 className="font-semibold text-white">The tutor is temporarily unavailable.</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">Your saved lessons and review queue are still available. Try again or continue practicing what you already have.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="min-h-11 rounded-xl bg-white px-4 text-sm font-semibold text-black" onClick={onRetry}>Try again</button>
            <button type="button" className="min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white hover:bg-white/[0.07]" onClick={onReview}>Open review</button>
          </div>
        </div>
      </div>
    </div>
  );
}
