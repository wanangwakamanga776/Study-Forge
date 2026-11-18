import { Brain, CheckCircle2, Clock3, Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppState } from '../types';
import { PracticeSession, PracticeQuestion } from '../components/practice/PracticeSession';
import { PyraMascot } from '../components/PyraMascot';

interface ReviewPageProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onAward?: (xp: number) => void;
}

export function ReviewPage({ state, onNavigate, onAward }: ReviewPageProps) {
  const [active, setActive] = useState(false);

  const questions: PracticeQuestion[] = useMemo(() => {
    const deck = state.decks?.[0];
    if (deck?.cards?.length) {
      return deck.cards.slice(0, 6).map((c: any, idx: number) => {
        const options = [
          c.definition || 'Definition',
          state.decks?.[0]?.cards?.[(idx + 1) % deck.cards.length]?.definition || 'Another concept',
          state.decks?.[0]?.cards?.[(idx + 2) % deck.cards.length]?.definition || 'A related idea',
          state.decks?.[0]?.cards?.[(idx + 3) % deck.cards.length]?.definition || 'A different term',
        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
        while (options.length < 4) options.push(`Option ${options.length + 1}`);
        const answerIndex = options.indexOf(c.definition || options[0]);
        return {
          id: c.id || `q-${idx}`,
          prompt: `What best matches: ${c.term || 'this concept'}?`,
          options,
          answerIndex: answerIndex >= 0 ? answerIndex : 0,
          explanation: c.explanation || c.definition || 'Review the key idea and try again later.',
        };
      });
    }
    return [
      {
        id: 'demo-1',
        prompt: 'What helps you remember information longer?',
        options: ['Cramming once', 'Retrieval practice', 'Only rereading notes', 'Skipping review'],
        answerIndex: 1,
        explanation: 'Retrieval practice strengthens memory by making you recall information actively.',
      },
      {
        id: 'demo-2',
        prompt: 'When is the best time to review a mistake?',
        options: ['Never', 'Only before exams', 'Soon after you make it', 'After a year'],
        answerIndex: 2,
        explanation: 'Reviewing mistakes soon helps correct misunderstandings before they stick.',
      },
    ];
  }, [state.decks]);

  if (active) {
    return (
      <PracticeSession
        title={state.decks?.[0]?.title || 'Quick review'}
        questions={questions}
        streak={state.stats?.streak || 0}
        onFinish={(result) => onAward?.(result.correct * 15)}
        onExit={() => setActive(false)}
        onReview={() => setActive(false)}
      />
    );
  }

  const dueCount = questions.length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PyraMascot expression="happy" className="w-14 h-14" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-orange-300)]">Review</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">Strengthen what you know</h1>
              <p className="mt-2 text-[var(--sf-text-muted)]">Short retrieval sessions help you remember longer.</p>
            </div>
          </div>
          <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-5 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={() => setActive(true)}>
            <Play aria-hidden="true" size={18} /> Start quick review
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--sf-orange-300)]"><Brain aria-hidden="true" size={18} /><span className="text-sm font-medium">Due now</span></div>
          <p className="mt-3 text-2xl font-semibold text-white">{dueCount}</p>
          <p className="text-sm text-[var(--sf-text-subtle)]">items ready to review</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--sf-orange-300)]"><Clock3 aria-hidden="true" size={18} /><span className="text-sm font-medium">Time</span></div>
          <p className="mt-3 text-2xl font-semibold text-white">~{Math.max(3, Math.ceil(dueCount * 1.2))} min</p>
          <p className="text-sm text-[var(--sf-text-subtle)]">estimated session</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5">
          <div className="flex items-center gap-2 text-[var(--sf-orange-300)]"><CheckCircle2 aria-hidden="true" size={18} /><span className="text-sm font-medium">Focus</span></div>
          <p className="mt-3 text-2xl font-semibold text-white">Learn</p>
          <p className="text-sm text-[var(--sf-text-subtle)]">by retrieval, not rereading</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Review tips</h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--sf-text-muted)]">
          <li className="flex gap-3"><RotateCcw className="mt-0.5 text-[var(--sf-orange-400)]" aria-hidden="true" size={16} /> Review mistakes soon to correct misunderstandings.</li>
          <li className="flex gap-3"><RotateCcw className="mt-0.5 text-[var(--sf-orange-400)]" aria-hidden="true" size={16} /> Keep sessions short and consistent for better retention.</li>
          <li className="flex gap-3"><RotateCcw className="mt-0.5 text-[var(--sf-orange-400)]" aria-hidden="true" size={16} /> Explain answers in your own words after each check.</li>
        </ul>
        <button type="button" className="mt-6 min-h-11 rounded-xl border border-white/10 px-4 text-sm text-white hover:bg-white/[0.07]" onClick={() => onNavigate('learn')}>Ask tutor for help</button>
      </section>
    </div>
  );
}
