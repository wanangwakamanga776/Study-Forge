import { Brain, CheckCircle2, Clock3, Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppState } from '../types';
import { PracticeSession, PracticeQuestion } from '../components/practice/PracticeSession';
import { PageHeader } from '../components/layout/PageHeader';

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
      <PageHeader
        title="Strengthen what you know"
        description="Short retrieval sessions help you remember longer than rereading ever will."
        action={
          <button type="button" className="sf-btn sf-btn-primary" onClick={() => setActive(true)}>
            <Play aria-hidden="true" size={16} /> Start quick review
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Brain, label: 'Due now', value: dueCount, hint: 'items ready to review' },
          { icon: Clock3, label: 'Time', value: `~${Math.max(3, Math.ceil(dueCount * 1.2))} min`, hint: 'estimated session' },
          { icon: CheckCircle2, label: 'Focus', value: 'Recall', hint: 'not rereading' },
        ].map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="sf-card p-5">
            <div className="flex items-center gap-2 text-[var(--sf-orange-300)]"><Icon aria-hidden="true" size={16} /><span className="text-[12.5px] font-medium">{label}</span></div>
            <p className="sf-stat-value mt-3 text-[26px]">{value}</p>
            <p className="mt-1 text-[12.5px] text-[var(--sf-text-subtle)]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <section className="sf-card p-6">
          <h2 className="sf-card-title">How this session works</h2>
          <ol className="mt-4 space-y-3 text-[13.5px] leading-6 text-[var(--sf-text-muted)]">
            {[
              'Answer one question at a time, without notes.',
              'See immediately whether you were right.',
              'Read the explanation and connect it to the concept.',
              'Missed items come back sooner in your next review.',
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--sf-border)] text-[11px] font-semibold text-[var(--sf-orange-300)]">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="sf-card p-6">
          <h2 className="sf-card-title">Review tips</h2>
          <ul className="mt-4 space-y-3 text-[13px] leading-6 text-[var(--sf-text-muted)]">
            <li className="flex gap-2.5"><RotateCcw className="mt-1 shrink-0 text-[var(--sf-orange-400)]" aria-hidden="true" size={14} /> Review mistakes soon to correct misunderstandings.</li>
            <li className="flex gap-2.5"><RotateCcw className="mt-1 shrink-0 text-[var(--sf-orange-400)]" aria-hidden="true" size={14} /> Keep sessions short and consistent for better retention.</li>
            <li className="flex gap-2.5"><RotateCcw className="mt-1 shrink-0 text-[var(--sf-orange-400)]" aria-hidden="true" size={14} /> Explain answers in your own words after each check.</li>
          </ul>
          <button type="button" className="sf-btn sf-btn-secondary mt-5 w-full" onClick={() => onNavigate('learn')}>Ask the tutor for help</button>
        </section>
      </div>
    </div>
  );
}
