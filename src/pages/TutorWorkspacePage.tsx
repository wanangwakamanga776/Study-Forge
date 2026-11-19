import { useMemo, useState } from 'react';
import { BookOpen, Layers, Plus, Search, Sparkles } from 'lucide-react';
import { AskTutorComposer, TeachingMode } from '../components/tutor/AskTutorComposer';
import { SourceRail, SourceItem } from '../components/tutor/SourceRail';
import { TutorMessage } from '../components/tutor/TutorMessage';
import { TutorLoading } from '../components/tutor/TutorLoading';
import { TutorUnavailable } from '../components/tutor/TutorUnavailable';
import { PageHeader } from '../components/layout/PageHeader';
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
      <PageHeader
        title="Learn it properly, one question at a time"
        description="Ask anything, ground answers in your own material, then turn the topic into practice."
        action={
          <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('review')}>
            <BookOpen aria-hidden="true" size={16} /> Open review
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)_270px]">
        <div className="hidden xl:block">
          <SourceRail
            sources={sources}
            onAdd={() => onOpenForge()}
            onSelect={(s) => setSelectedSourceId((prev) => (prev === s.id ? null : s.id))}
          />
        </div>

        <div className="space-y-5">
          <AskTutorComposer onSubmit={handleSubmit} disabled={status === 'loading'} />

          <div aria-live="polite" aria-atomic="false" className="space-y-4">
            {status === 'loading' && <TutorLoading />}
            {status === 'error' && <TutorUnavailable onRetry={() => setStatus('idle')} onReview={() => onNavigate('review')} />}

            {status === 'idle' && thread.length === 0 && (
              <div className="sf-card border-dashed px-6 py-10 text-center">
                <Sparkles className="mx-auto mb-3 text-[var(--sf-orange-400)]" aria-hidden="true" />
                <p className="text-sm font-medium text-white">Start with a question or topic.</p>
                <p className="mt-1.5 text-[13px] text-[var(--sf-text-subtle)]">Ask for an explanation, a comparison, an example, or a quick quiz.</p>
              </div>
            )}

            {thread.map((item) => (
              <div key={item.id} className="space-y-3">
                <div className="ml-auto max-w-2xl rounded-[16px] border border-[var(--sf-border)] bg-white/[0.035] p-4">
                  <p className="sf-eyebrow mb-2">You asked ({item.mode})</p>
                  <p className="whitespace-pre-wrap text-[14px] leading-6 text-white/90">{item.question}</p>
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
          </div>
        </div>

        <aside className="space-y-4">
          <section className="sf-card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Layers aria-hidden="true" size={15} className="text-[var(--sf-orange-400)]" /> Practice</div>
            <p className="text-[13px] leading-6 text-[var(--sf-text-muted)]">Turn this topic into a short retrieval session to strengthen memory.</p>
            <button type="button" className="sf-btn sf-btn-primary mt-4 w-full" onClick={() => onNavigate('review')}>
              <Plus aria-hidden="true" size={16} /> Start practice
            </button>
          </section>
          <section className="sf-card p-5 xl:hidden">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Search aria-hidden="true" size={15} className="text-[var(--sf-orange-400)]" /> Sources</div>
            <p className="text-[13px] leading-6 text-[var(--sf-text-muted)]">Add material to ground answers in your own notes and documents.</p>
            <button type="button" className="sf-btn sf-btn-secondary mt-4 w-full" onClick={() => onOpenForge()}>Add material</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
