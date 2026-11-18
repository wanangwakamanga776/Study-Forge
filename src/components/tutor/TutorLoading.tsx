import { PyraMascot } from '../PyraMascot';

export function TutorLoading() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <PyraMascot expression="thinking" className="w-12 h-12" />
        <div>
          <p className="font-medium text-white">Building your explanation</p>
          <p className="mt-1 text-sm text-[var(--sf-text-subtle)]">Study Forge is organizing the idea into a clear lesson.</p>
        </div>
      </div>
    </div>
  );
}
