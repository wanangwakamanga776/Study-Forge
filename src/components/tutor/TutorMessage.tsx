import { Check, Copy, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { PyraMascot } from '../PyraMascot';

interface TutorMessageProps {
  answer: string;
  why?: string;
  example?: string;
  onPractice: () => void;
  onSave: () => void;
}

export function TutorMessage({ answer, why, example, onPractice, onSave }: TutorMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5 shadow-[var(--sf-shadow-card)] sm:p-7">
      <div className="flex items-center gap-3 text-sm font-semibold text-[var(--sf-orange-300)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--sf-orange-500)]/15"><PyraMascot expression="happy" className="w-8 h-8" /></span>
        Study Forge tutor
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Short answer</h2>
          <p className="mt-2 whitespace-pre-wrap text-lg leading-8 text-white">{answer}</p>
        </section>

        {why && (
          <section className="rounded-2xl border border-[var(--sf-info)]/20 bg-[var(--sf-info-soft)] p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-info)]"><Lightbulb aria-hidden="true" size={15} /> Why it works</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--sf-text-muted)]">{why}</p>
          </section>
        )}

        {example && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]">Example</h2>
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-7 text-[var(--sf-text-muted)] whitespace-pre-wrap">{example}</div>
          </section>
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-2 border-t border-white/[0.08] pt-5">
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 text-sm font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={onPractice}><RotateCcw aria-hidden="true" size={16} /> Practice this</button>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={onSave}><Check aria-hidden="true" size={16} /> Save for review</button>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={copyAnswer}>{copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />} {copied ? 'Copied' : 'Copy'}</button>
      </div>
    </article>
  );
}
