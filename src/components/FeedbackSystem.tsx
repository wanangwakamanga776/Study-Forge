import React, { useState } from 'react';
import { Send, Bug, Sparkles, MessageSquare, Laptop, CheckCircle2, ChevronRight, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { submitFeedback } from '../services/dataService';
import { useAuthContext } from '../contexts/AuthContext';

const FEEDBACK_CATEGORIES = [
  { id: 'Bug Report', icon: <Bug size={13} /> },
  { id: 'Feature Request', icon: <Sparkles size={13} /> },
  { id: 'UI Suggestion', icon: <Laptop size={13} /> },
  { id: 'Performance Issue', icon: <Zap size={13} /> },
  { id: 'General Feedback', icon: <MessageSquare size={13} /> },
];

export const FeedbackSection: React.FC = () => {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[4].id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setError(null);
    soundService.playClick();

    try {
      await submitFeedback({
        userId: user?.uid || 'guest',
        username: user?.displayName || 'Guest User',
        title,
        message,
        category: category as any,
        status: 'pending',
        createdAt: Date.now(),
      });

      setIsSuccess(true);
      soundService.playSuccess();
      setTitle('');
      setMessage('');
      setCategory(FEEDBACK_CATEGORIES[4].id);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 3000);
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError('Could not send your feedback right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="sf-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="sf-eyebrow">Feedback</p>
          <h2 className="sf-card-title mt-2">Help improve Study Forge</h2>
          <p className="mt-1 text-[13px] text-[var(--sf-text-muted)]">Report a problem or suggest what to build next.</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]"><MessageSquare size={16} aria-hidden="true" /></span>
      </div>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => { setIsOpen(true); soundService.playClick(); }}
          className="mt-5 flex w-full items-center justify-between gap-4 rounded-[12px] border border-[var(--sf-border)] bg-white/[0.02] px-4 py-3.5 text-left transition hover:border-[var(--sf-border-strong)] hover:bg-white/[0.04]"
        >
          <span>
            <span className="block text-[13.5px] font-medium text-white">Send feedback</span>
            <span className="mt-0.5 block text-[12px] text-[var(--sf-text-subtle)]">Takes about a minute</span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-[var(--sf-text-subtle)]" />
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-medium text-white">New report</p>
            <button type="button" aria-label="Close feedback form" onClick={() => setIsOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--sf-text-subtle)] hover:bg-white/[0.06] hover:text-white">
              <X size={16} />
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-[10px] border border-[var(--sf-danger)]/30 bg-[var(--sf-danger-soft)] px-3.5 py-2.5 text-[12.5px] text-rose-100">{error}</p>
          )}

          <div>
            <label htmlFor="feedback-title" className="mb-1.5 block text-[12px] font-medium text-[var(--sf-text-muted)]">Title</label>
            <input
              id="feedback-title"
              required
              type="text"
              placeholder="Briefly describe the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sf-input"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-[12px] font-medium text-[var(--sf-text-muted)]">Type</legend>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium transition',
                    category === cat.id
                      ? 'border-[var(--sf-orange-400)]/45 bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]'
                      : 'border-[var(--sf-border)] text-[var(--sf-text-subtle)] hover:bg-white/[0.05] hover:text-white',
                  )}
                >
                  {cat.icon}
                  {cat.id}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="feedback-message" className="mb-1.5 block text-[12px] font-medium text-[var(--sf-text-muted)]">Message</label>
            <textarea
              id="feedback-message"
              required
              placeholder="What happened, or what would you like to see?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="sf-input sf-textarea min-h-28"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--sf-text-disabled)]">
              {user?.uid ? `Sending as ${user.uid.slice(0, 8)}...` : 'Sending as guest'}
            </p>
            <button type="submit" disabled={isSubmitting || isSuccess} className={cn('sf-btn', isSuccess ? 'bg-emerald-500 text-emerald-950' : 'sf-btn-primary')}>
              {isSuccess ? <><CheckCircle2 size={16} aria-hidden="true" /> Sent</> : isSubmitting ? 'Sending...' : <><Send size={15} aria-hidden="true" /> Send feedback</>}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
