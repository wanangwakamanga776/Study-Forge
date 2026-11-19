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
    <section className="sf-card p-5 sm:p-6">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="text-[var(--sf-orange-400)]" aria-hidden="true" size={17} />
          Ask your tutor
        </div>
        <span className="hidden text-[11px] text-[var(--sf-text-disabled)] sm:block">Ctrl + Enter to send</span>
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
        className="sf-input sf-textarea min-h-[104px]"
        disabled={disabled}
      />

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Attached files">
          {files.map((file) => (
            <span key={`${file.name}-${file.lastModified}`} className="sf-chip max-w-full">
              <FileText aria-hidden="true" size={13} />
              <span className="max-w-40 truncate">{file.name}</span>
              <button type="button" className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))}>
                <X aria-hidden="true" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex flex-col gap-3 border-t border-[var(--sf-border)] pt-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Teaching mode">
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
                  'min-h-9 rounded-full border px-3 text-xs font-medium transition',
                  selected
                    ? 'border-[var(--sf-orange-400)]/45 bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]'
                    : 'border-[var(--sf-border)] text-[var(--sf-text-subtle)] hover:bg-white/[0.05] hover:text-white',
                )}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <input ref={inputRef} type="file" className="sr-only" accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          <button type="button" className="sf-btn sf-btn-ghost" onClick={() => inputRef.current?.click()}>
            <Paperclip aria-hidden="true" size={16} /> Add material
          </button>
          <button type="button" disabled={disabled || (!question.trim() && files.length === 0)} className="sf-btn sf-btn-primary px-4" onClick={submit}>
            <span className="hidden sm:inline">Teach me</span>
            <ArrowUp aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
