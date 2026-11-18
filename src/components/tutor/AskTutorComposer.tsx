import { ArrowUp, FileText, Paperclip, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export type TeachingMode = 'explain' | 'example' | 'compare' | 'quiz';

const modes: Array<{ id: TeachingMode; label: string; description: string }> = [
  { id: 'explain', label: 'Explain', description: 'Start from the basics' },
  { id: 'example', label: 'Example', description: 'Make it concrete' },
  { id: 'compare', label: 'Compare', description: 'See differences' },
  { id: 'quiz', label: 'Quiz me', description: 'Practice recall' },
];

interface AskTutorComposerProps {
  onSubmit: (payload: { question: string; mode: TeachingMode; files: File[] }) => void;
  disabled?: boolean;
}

export function AskTutorComposer({ onSubmit, disabled = false }: AskTutorComposerProps) {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<TeachingMode>('explain');
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = question.trim();
    if (!trimmed && files.length === 0) return;
    onSubmit({ question: trimmed, mode, files });
    setQuestion('');
    setFiles([]);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-4 sm:p-6 shadow-[var(--sf-shadow-card)]">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles className="text-[var(--sf-orange-400)]" aria-hidden="true" size={18} />
        Ask your tutor
      </div>

      <label htmlFor="tutor-question" className="sr-only">What do you want to learn?</label>
      <textarea
        id="tutor-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit();
        }}
        placeholder="Ask anything, paste a problem, or describe what feels confusing..."
        className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-base leading-7 text-white placeholder:text-[var(--sf-text-disabled)] focus:border-[var(--sf-orange-400)] focus:outline-none"
        disabled={disabled}
      />

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Attached files">
          {files.map((file) => (
            <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-[var(--sf-text-muted)]">
              <FileText aria-hidden="true" size={14} />
              <span className="max-w-40 truncate">{file.name}</span>
              <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))}>
                <X aria-hidden="true" size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Teaching mode">
          {modes.map((item) => {
            const selected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={item.description}
                className={cn(
                  'min-h-10 rounded-full border px-3 text-xs font-medium transition',
                  selected ? 'border-[var(--sf-orange-400)]/50 bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]' : 'border-white/10 text-[var(--sf-text-subtle)] hover:bg-white/[0.06] hover:text-white'
                )}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <input ref={inputRef} type="file" className="sr-only" accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.07] hover:text-white" onClick={() => inputRef.current?.click()}>
            <Paperclip aria-hidden="true" size={17} /> Add material
          </button>
          <button type="button" disabled={disabled || (!question.trim() && files.length === 0)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black transition hover:bg-[var(--sf-orange-400)] disabled:cursor-not-allowed disabled:opacity-40" onClick={submit}>
            <span className="hidden sm:inline">Teach me</span>
            <ArrowUp aria-hidden="true" size={18} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--sf-text-disabled)]">Ctrl+Enter to send.</p>
    </section>
  );
}