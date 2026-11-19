import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Sparkles, Loader2, CheckCircle2, AlertCircle, X,
  BrainCircuit, Trash2, Send, Zap, Layers, FileText,
  Pencil, Check, BookOpen, LayoutGrid, CircleAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserStats } from '../types';
import { extractTextFromFile } from '../lib/extraction';
import { isAIConfigured } from '../services/aiConfig';
import { soundService } from '../services/soundService';
import { PyraMascot } from './PyraMascot';
import { useForgeStore } from '../contexts/ForgeStoreContext';

// ─── Toast Notification System ───────────────────────────────────
interface ToastProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}

function ToastStack({ toasts, onRemove }: { toasts: ToastProps[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'pointer-events-auto flex items-start gap-4 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl min-w-[280px] max-w-xs',
              t.color
            )}
          >
            <div className="text-xl mt-0.5 shrink-0">{t.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-white">{t.title}</p>
              <p className="text-xs text-white/60 mt-0.5">{t.body}</p>
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="text-white/30 hover:text-white/70 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const add = useCallback((t: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);
  const remove = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Inline editable lesson name ───────────────────────────────────
function EditableName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
          className="sf-input flex-1"
        />
        <button type="button" onClick={commit} className="sf-icon-btn h-10 w-10" aria-label="Save lesson name">
          <Check size={16} />
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="group flex w-full items-center gap-2.5 text-left">
      <span className="text-[17px] font-semibold leading-snug text-white">{value}</span>
      <Pencil size={14} className="shrink-0 text-[var(--sf-text-subtle)] transition-colors group-hover:text-[var(--sf-orange-300)]" aria-hidden="true" />
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface AIGeneratorProps {
  stats: UserStats;
  onGenerated: (type: 'flashcards' | 'quiz' | 'forgeCast' | 'lesson', data: any) => void;
  onOpenPremium: () => void;
  onNavigate?: (view: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTopic?: string;
  hideTrigger?: boolean;
  isAdmin?: boolean;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({
  stats, onGenerated, onOpenPremium, onNavigate,
  isOpen: controlledIsOpen, onOpenChange, initialTopic, hideTrigger, isAdmin = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;
  const { processSessionCompletion } = useForgeStore();
  const { toasts, add: addToast, remove: removeToast } = useToasts();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessonName, setLessonName] = useState('');
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);
  const [generatedDeck, setGeneratedDeck] = useState<any>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  useEffect(() => { if (initialTopic && isOpen) setPastedText(initialTopic); }, [initialTopic, isOpen]);

  const handleFileSelect = (file: File) => {
    const allowed = ['.pdf', '.docx', '.doc', '.rtf', '.odt', '.pages', '.txt', '.pptx', '.ppt', '.ppsx', '.odp', '.key', '.potx'];
    if (allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setSelectedFile(file);
      setError(null);
      soundService.playSuccess();
    } else { 
      setError('Unsupported file type. Please upload a valid document or presentation slides (PDF, DOCX, TXT, PPTX).'); 
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    soundService.playClick();
  };

  const deriveName = (aiTitle: string, fallback: string): string => {
    if (aiTitle && aiTitle.length > 3 && aiTitle.toLowerCase() !== 'untitled') return aiTitle;
    const words = fallback.trim().split(/\s+/).slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  const generateLessonMaterial = async () => {
    if (!selectedFile && pastedText.trim().length < 20) { 
      setError('Please provide at least 20 characters of information, or upload a study file.'); 
      return; 
    }
    
    setError(null);
    setIsGenerating(true);
    setProgress(10); 
    setLoadingMessage('Initializing Forge Engine...');
    
    try {
      let extractedText = '';
      if (selectedFile) {
        setProgress(25);
        setLoadingMessage('Extracting knowledge from document...');
        extractedText = await extractTextFromFile(selectedFile);
      }
      
      const contentToUse = extractedText || pastedText;
      if (contentToUse.trim().length < 20) {
        throw new Error('Could not extract sufficient text from document. Please ensure the document is not empty.');
      }

      setProgress(40);
      setLoadingMessage('Conducting Cognitive Fusion...');
      
      const rawTitle = selectedFile ? selectedFile.name.split('.')[0] : pastedText.substring(0, 30).trim();
      const { generateStudyMaterial } = await import('../services/aiService');
      
      setProgress(60);
      setLoadingMessage('Synthesizing lessons, flashcards, and interactive quiz...');
      
      const { deck, quiz, lesson } = await generateStudyMaterial(
        contentToUse, 
        rawTitle, 
        pastedText, 
        15, 
        'medium', 
        'both', 
        'gcse', 
        'General', 
        undefined, 
        (stage) => {
          if (stage === 'cards') {
            setProgress(75);
            setLoadingMessage('Assembling flashcard registry...');
          } else if (stage === 'quiz') {
            setProgress(88);
            setLoadingMessage('Crafting evaluation suite...');
          } else if (stage === 'finalizing') {
            setProgress(95);
            setLoadingMessage('Publishing curriculum matrix...');
          }
        }, 
        true, 
        isAdmin, 
        'standard'
      );
      
      setProgress(100);
      const aiSuggestedTitle = lesson?.audit_metadata?.title || rawTitle;
      const finalName = deriveName(aiSuggestedTitle, pastedText || rawTitle);
      
      const processedLesson = { 
        ...lesson, 
        audit_metadata: { ...lesson?.audit_metadata, title: finalName } 
      };
      const processedDeck = { ...deck, title: finalName };
      const processedQuiz = { ...quiz, title: finalName };
      
      setGeneratedLesson(processedLesson);
      setGeneratedDeck(processedDeck);
      setGeneratedQuiz(processedQuiz);
      setLessonName(finalName);
      
      // Send directly to the store/state
      if (processedLesson) onGenerated('lesson', processedLesson);
      if (processedDeck) onGenerated('flashcards', processedDeck);
      if (processedQuiz) onGenerated('quiz', processedQuiz);
      
      setIsSuccess(true);
      soundService.playSuccess();
      addToast({ 
        icon: <Layers size={18} className="text-emerald-400" />, 
        title: 'Curriculum Created', 
        body: `Study elements generated for: ${finalName}`, 
        color: 'bg-stone-900/95 border-emerald-500/30 text-white' 
      });
    } catch (err: any) { 
      console.error(err);
      setError(err.message || 'Error occurred during generation.'); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleNameChange = (newName: string) => {
    setLessonName(newName);
    if (generatedLesson) onGenerated('lesson', { ...generatedLesson, audit_metadata: { ...generatedLesson.audit_metadata, title: newName } });
    if (generatedDeck) onGenerated('flashcards', { ...generatedDeck, title: newName });
    if (generatedQuiz) onGenerated('quiz', { ...generatedQuiz, title: newName });
  };

  return (
    <>
      <ToastStack toasts={toasts} onRemove={removeToast} />
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => { setIsOpen(true); soundService.playClick(); }}
          className="sf-btn sf-btn-primary"
        >
          Create study session
        </button>
      )}
      
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setIsOpen(false)} 
              className="absolute inset-0 bg-black/85 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="sf-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="study-session-title"
            >
              {/* Header */}
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--sf-border)] pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <h2 id="study-session-title" className="text-[17px] font-semibold leading-tight text-white">Create a study session</h2>
                    <p className="mt-0.5 text-[11.5px] text-[var(--sf-text-subtle)]">Lessons, flashcards, and quizzes from your material</p>
                  </div>
                </div>
                {!isGenerating && (
                  <button 
                    onClick={() => { setIsOpen(false); soundService.playClick(); }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--sf-text-subtle)] transition-colors hover:bg-white/[0.06] hover:text-white"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {isGenerating ? (
                /* Dynamic Generating State */
                <div className="my-auto flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--sf-border)] border-t-[var(--sf-orange-500)]"
                    >
                      <Sparkles size={26} className="text-[var(--sf-orange-300)]" aria-hidden="true" />
                    </motion.div>
                  </div>

                  <div className="max-w-md space-y-2.5">
                    <h3 className="text-xl font-semibold text-white">Building your session</h3>
                    <p className="text-[13px] text-[var(--sf-orange-300)]">{loadingMessage}</p>
                    <p className="text-[12px] leading-6 text-[var(--sf-text-subtle)]">This usually takes under a minute. Keep this tab open while the lesson, flashcards, and quiz are prepared.</p>
                  </div>

                  {/* Progress Meter */}
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-[11px] font-medium text-[var(--sf-text-subtle)]">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="sf-progress h-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Session generation progress">
                      <motion.span
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              ) : isSuccess ? (
                /* Success celebration state */
                <div className="flex flex-1 flex-col items-center justify-center gap-7 py-6 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-[var(--sf-success)]/35 bg-[var(--sf-success-soft)]">
                    <CheckCircle2 size={30} className="text-emerald-300" aria-hidden="true" />
                  </div>

                  <div>
                    <p className="sf-eyebrow text-[var(--sf-success)]">Session ready</p>
                    <h3 className="mt-2 text-[22px] font-semibold text-white">Your materials are built</h3>
                    <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--sf-text-muted)]">A lesson, a flashcard deck, and a quiz were created from your source. You can rename the lesson below.</p>
                  </div>

                  <div className="w-full max-w-md rounded-[12px] border border-[var(--sf-border)] bg-white/[0.02] p-4 text-left">
                    <p className="mb-2 text-[12px] font-medium text-[var(--sf-text-muted)]">Lesson name</p>
                    <EditableName value={lessonName} onChange={handleNameChange} />
                  </div>

                  <div className="flex w-full max-w-md flex-col gap-2.5">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setIsSuccess(false);
                        setSelectedFile(null);
                        setPastedText('');
                        soundService.playSuccess();
                      }}
                      className="sf-btn sf-btn-primary w-full"
                    >
                      Open new lesson
                    </button>
                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setSelectedFile(null);
                        setPastedText('');
                        soundService.playClick();
                      }}
                      className="sf-btn sf-btn-secondary w-full"
                    >
                      Create another session
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit & Input setup state */
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pr-1">
                  {/* Drag and Drop Box */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed p-6 text-center transition-colors",
                      isDragging
                        ? "border-[var(--sf-orange-400)] bg-[var(--sf-orange-500)]/[0.08]"
                        : selectedFile
                          ? "border-[var(--sf-success)]/35 bg-[var(--sf-success-soft)]"
                          : "border-[var(--sf-border-strong)] hover:border-[var(--sf-text-disabled)] hover:bg-white/[0.02]"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={e => e.target.files && handleFileSelect(e.target.files[0])}
                      accept=".pdf,.docx,.doc,.rtf,.odt,.pages,.txt,.pptx,.ppt,.ppsx,.odp,.key,.potx"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
                        <div className="grid h-11 w-11 place-items-center rounded-[11px] bg-[var(--sf-success)]/12 text-emerald-300">
                          <FileText size={22} />
                        </div>
                        <div>
                          <p className="max-w-xs truncate text-[13.5px] font-medium text-white">{selectedFile.name}</p>
                          <p className="mt-1 text-[11.5px] text-[var(--sf-text-subtle)]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB &middot; ready to use</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--sf-border)] px-3 text-[12px] text-[var(--sf-text-muted)] transition-colors hover:border-[var(--sf-danger)]/40 hover:text-rose-200"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-white/[0.04] text-[var(--sf-text-subtle)]">
                          <Upload size={20} aria-hidden="true" />
                        </div>
                        <p className="text-[13.5px] font-medium text-white">Upload a study source</p>
                        <p className="mt-1 max-w-xs text-[12px] leading-5 text-[var(--sf-text-subtle)]">Drag and drop documents or lectures here, or click to browse.</p>
                        <p className="mt-3 text-[11px] text-[var(--sf-text-disabled)]">PDF, DOCX, TXT, PPTX, PAGES, RTF</p>
                      </>
                    )}
                  </div>

                  {/* Text Input Prompt */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="study-session-source" className="text-[12px] font-medium text-[var(--sf-text-muted)]">
                        {selectedFile ? 'Optional instructions' : 'Paste notes or enter a study topic'}
                      </label>
                      <span className="text-[11px] text-[var(--sf-text-disabled)]">{pastedText.length} characters</span>
                    </div>
                    <textarea
                      id="study-session-source"
                      value={pastedText}
                      onChange={e => { setPastedText(e.target.value); if (error) setError(null); }}
                      placeholder={
                        selectedFile
                          ? "Optional: tell the tutor what to focus on, for example “explain with easy analogies”."
                          : "Enter a subject, paste reference text, or list the terms you need to learn..."
                      }
                      className="sf-input sf-textarea min-h-[132px]"
                    />
                  </div>

                  {/* Error display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 rounded-[10px] border border-[var(--sf-danger)]/25 bg-[var(--sf-danger-soft)] p-3.5 text-[12.5px] text-rose-100"
                      role="alert"
                    >
                      <AlertCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                      <div className="leading-relaxed">{error}</div>
                    </motion.div>
                  )}

                  {/* Forge button */}
                  <div className="shrink-0">
                    <button
                      disabled={isGenerating || (!selectedFile && pastedText.trim().length < 20)}
                      onClick={() => { generateLessonMaterial(); soundService.playClick(); }}
                      className="sf-btn sf-btn-primary w-full"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      Create study session
                    </button>
                    <p className="mt-3 text-center text-[11.5px] text-[var(--sf-text-disabled)]">AI availability depends on configuration and plan limits. Saved materials remain accessible.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
