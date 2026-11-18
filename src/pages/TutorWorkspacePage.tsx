import { useMemo, useState } from 'react';
import { BookOpen, Layers, Plus, Search, Sparkles } from 'lucide-react';
import { AskTutorComposer, TeachingMode } from '../components/tutor/AskTutorComposer';
import { SourceRail, SourceItem } from '../components/tutor/SourceRail';
import { TutorMessage } from '../components/tutor/TutorMessage';
import { TutorLoading } from '../components/tutor/TutorLoading';
import { TutorUnavailable } from '../components/tutor/TutorUnavailable';
import { PyraMascot } from '../components/PyraMascot';
import { cn } from '../lib/utils';
import { AppState } from '../types';

interface TutorWorkspacePageProps {
  state: AppState;
  onOpenForge: (topic?: string) => void;
  onNavigate: (view: string) => void;
}

interface ThreadItem {
  id: string;
  question: string;
  mode: TeachingMode;
  answer: string;
  why: string;
  example: string;
}

const modeIntro: Record<TeachingMode, string> = {
  explain: 'Here is a clear explanation you can build on.',
  example: 'Here is a concrete example to make it easier to see.',
  compare: 'Here is a comparison to highlight the key differences.',
  quiz: 'Let’s test your understanding step by step.',
};

export function TutorWorkspacePage({ state, onOpenForge, onNavigate }: TutorWorkspacePageProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const sources: SourceItem[] = useMemo(() => {
    const fromLessons = (state.lessons || []).map((l: any, i: number) => ({
      id: `lesson-${l.id || i}`,
      title: l.audit_metadata?.title || l.title || 'Lesson',
      kind: 'note' as const,
      selected: selectedSourceId === `lesson-${l.id || i}`,
    }));
    const fromDecks = (state.decks || []).map((d: any) => ({
      id: `deck-${d.id}`,
      title: d.title || 'Flashcard deck',
      kind: 'note' as const,
      selected: selectedSourceId === `deck-${d.id}`,
    }));
    return [...fromLessons, ...fromDecks].slice(0, 20);
  }, [state.lessons, state.decks, selectedSourceId]);

  const handleSubmit = ({ question, mode }: { question: string; mode: TeachingMode; files: File[] }) => {
    if (!question.trim()) return;
    setStatus('loading');
    window.setTimeout(() => {
      const grounded = selectedSourceId ? ' (grounded in your selected material)' : '';
      const item: ThreadItem = {
        id: `t-${Date.now()}`,
        question,
        mode,
        answer: `${modeIntro[mode]}${grounded}\n\n${question}`,
        why: 'Study Forge breaks ideas into short steps so you can understand the concept before practicing it.',
        example: 'Try explaining the idea in your own words, then answer one practice question to check your understanding.',
      };
      setThread((prev) => [item, ...prev]);
      setStatus('ready');
    }, 700);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PyraMascot expression="happy" className="w-14 h-14" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Tutor workspace</h1>
              <p className="text-sm text-[var(--sf-text-muted)] mt-1">Ask questions, use your materials, and practice what you learn.</p>
            </div>
          </div>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={() => onNavigate('review')}>
            <BookOpen aria-hidden="true" size={16} /> Open review
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <div className="hidden xl:block">
          <SourceRail
            sources={sources}
            onAdd={() => onOpenForge()}
            onSelect={(s) => setSelectedSourceId((prev) => (prev === s.id ? null : s.id))}
          />
        </div>

        <div className="space-y-6">
          <AskTutorComposer onSubmit={handleSubmit} disabled={status === 'loading'} />

          <div aria-live="polite" aria-atomic="false" className="space-y-4">
            {status === 'loading' && <TutorLoading />}
            {status === 'error' && <TutorUnavailable onRetry={() => setStatus('idle')} onReview={() => onNavigate('review')} />}
            {thread.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="ml-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-[var(--sf-text-muted)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sf-text-subtle)] mb-2">You asked ({item.mode})</p>
                  <p className="whitespace-pre-wrap text-white/90">{item.question}</p>
                </div>
                <TutorMessage
                  answer={item.answer}
                  why={item.why}
                  example={item.example}
                  onPractice={() => onNavigate('review')}
                  onSave={() => onNavigate('review')}
                />
              </div>
            ))}
            {status === 'idle' && thread.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <Sparkles className="mx-auto text-[var(--sf-orange-400)] mb-3" aria-hidden="true" />
                <p className="text-white font-medium">Start with a question or topic.</p>
                <p className="mt-2 text-sm text-[var(--sf-text-subtle)]">I can explain, compare ideas, show examples, or quiz you.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3"><Layers aria-hidden="true" size={16} className="text-[var(--sf-orange-400)]" /> Practice</div>
            <p className="text-sm text-[var(--sf-text-muted)] leading-6">Turn this topic into a short retrieval session to strengthen memory.</p>
            <button type="button" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 text-sm font-semibold text-black hover:bg-[var(--sf-orange-400)]" onClick={() => onNavigate('review')}>
              <Plus aria-hidden="true" size={16} /> Start practice
            </button>
          </section>
          <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-5 xl:hidden">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3"><Search aria-hidden="true" size={16} className="text-[var(--sf-orange-400)]" /> Sources</div>
            <p className="text-sm text-[var(--sf-text-muted)]">Use the Learn workspace on desktop to pin sources, or add material to ground answers.</p>
            <button type="button" className="mt-4 min-h-11 rounded-xl border border-white/10 px-4 text-sm text-white hover:bg-white/[0.07]" onClick={() => onOpenForge()}>Add material</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
