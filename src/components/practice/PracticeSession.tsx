import { Check, ChevronRight, CircleHelp, Flame, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { PyraMascot } from '../PyraMascot';
import { SessionComplete } from './SessionComplete';

export interface PracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface PracticeSessionProps {
  title: string;
  questions: PracticeQuestion[];
  xpPerQuestion?: number;
  streak?: number;
  onFinish: (result: { correct: number; total: number }) => void;
  onExit: () => void;
  onReview?: () => void;
}

export function PracticeSession({ title, questions, xpPerQuestion = 15, streak = 0, onFinish, onExit, onReview }: PracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState<null | { correct: number; total: number }>(null);

  if (!questions.length) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-8 text-center">
        <PyraMascot expression="thinking" className="mx-auto w-16 h-16 mb-4" />
        <h1 className="text-xl font-semibold text-white">No questions ready yet</h1>
        <p className="mt-2 text-[var(--sf-text-muted)]">Add material or ask the tutor to generate a practice set.</p>
        <button type="button" className="mt-6 min-h-11 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black" onClick={onExit}>Back</button>
      </div>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const isCorrect = selected === question.answerIndex;

  if (finished) {
    return (
      <SessionComplete
        correct={finished.correct}
        total={finished.total}
        xpEarned={finished.correct * xpPerQuestion}
        streak={streak}
        onContinue={onExit}
        onReview={onReview || onExit}
      />
    );
  }

  const check = () => {
    if (selected === null) return;
    setChecked(true);
    if (selected === question.answerIndex) setCorrect((value) => value + 1);
  };

  const next = () => {
    if (isLast) {
      const finalCorrect = correct + (selected === question.answerIndex ? 1 : 0);
      const result = { correct: finalCorrect, total: questions.length };
      onFinish(result);
      setFinished(result);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <button type="button" className="min-h-11 rounded-xl px-3 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={onExit}>Exit session</button>
        <div className="text-center"><p className="text-sm font-semibold text-white">{title}</p><p className="text-xs text-[var(--sf-text-subtle)]">Learn by retrieval</p></div>
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--sf-orange-500)]/15 px-3 py-2 text-xs font-semibold text-[var(--sf-orange-300)]"><Flame aria-hidden="true" size={14} /> +{xpPerQuestion} XP</div>
      </header>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--sf-text-subtle)]"><span>Question {index + 1} of {questions.length}</span><span>{Math.round(((index + 1) / questions.length) * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((index + 1) / questions.length) * 100)} aria-label="Practice progress"><div className="h-full rounded-full bg-[var(--sf-orange-500)] transition-[width] duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 shadow-[var(--sf-shadow-card)] sm:p-10">
        <div className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)]"><CircleHelp aria-hidden="true" size={16} /> Check your understanding</div>
        <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{question.prompt}</h1>

        <div className="mt-8 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const chosen = selected === optionIndex;
            const answer = checked && optionIndex === question.answerIndex;
            const wrong = checked && chosen && !isCorrect;
            return (
              <button
                key={`${question.id}-${optionIndex}`}
                type="button"
                disabled={checked}
                className={cn(
                  'flex min-h-14 items-center gap-4 rounded-2xl border px-4 text-left text-base transition',
                  answer && 'border-[var(--sf-success)]/60 bg-[var(--sf-success-soft)] text-white',
                  wrong && 'border-[var(--sf-danger)]/60 bg-[var(--sf-danger-soft)] text-white',
                  !checked && chosen && 'border-[var(--sf-orange-400)] bg-[var(--sf-orange-500)]/15 text-white',
                  !checked && !chosen && 'border-white/10 bg-white/[0.025] text-[var(--sf-text-muted)] hover:border-white/25 hover:bg-white/[0.06] hover:text-white',
                )}
                aria-pressed={chosen}
                onClick={() => setSelected(optionIndex)}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-current/20 text-sm font-semibold">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="flex-1">{option}</span>
                {answer && <Check aria-hidden="true" size={18} className="text-[var(--sf-success)]" />}
                {wrong && <X aria-hidden="true" size={18} className="text-[var(--sf-danger)]" />}
              </button>
            );
          })}
        </div>

        {checked && (
          <div className={cn('mt-6 rounded-2xl border p-4', isCorrect ? 'border-[var(--sf-success)]/25 bg-[var(--sf-success-soft)]' : 'border-[var(--sf-danger)]/25 bg-[var(--sf-danger-soft)]')} role="status">
            <div className="flex items-start gap-3">
              <PyraMascot expression={isCorrect ? 'excited' : 'thinking'} className="w-10 h-10 shrink-0" />
              <div>
                <p className="font-semibold text-white">{isCorrect ? 'Correct.' : 'Not quite yet.'}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--sf-text-muted)]">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          {!checked ? (
            <button type="button" disabled={selected === null} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black hover:bg-[var(--sf-orange-400)] disabled:cursor-not-allowed disabled:opacity-40" onClick={check}>Check answer <Check aria-hidden="true" size={18} /></button>
          ) : (
            <button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={next}>{isLast ? 'Finish session' : 'Continue'} <ChevronRight aria-hidden="true" size={18} /></button>
          )}
        </div>
      </section>
    </div>
  );
}
