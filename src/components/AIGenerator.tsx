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
          className="flex-1 bg-white/5 border border-forge-accent/50 rounded-xl px-4 py-2 text-white font-display font-black uppercase italic tracking-tighter text-xl focus:outline-none focus:border-forge-accent"
        />
        <button onClick={commit} className="p-2 bg-forge-accent/20 text-forge-accent rounded-xl hover:bg-forge-accent/30 transition-colors">
          <Check size={16} />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-3 text-left w-full">
      <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white leading-tight">
        {value}
      </h3>
      <Pencil size={14} className="text-stone-600 group-hover:text-forge-accent transition-colors shrink-0" />
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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
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
    } else { setError('Please upload a valid document or slide file.'); }
  };
  const deriveName = (aiTitle: string, fallback: string): string => {
    if (aiTitle && aiTitle.length > 3 && aiTitle.toLowerCase() !== 'untitled') return aiTitle;
    const words = fallback.trim().split(/\s+/).slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  const generateLessonMaterial = async () => {
    if (pastedText.trim().length < 20) { setError('Please provide at least 20 characters.'); return; }
    setIsGenerating(true);
    setProgress(10); setLoadingMessage('Initializing Forge...');
    try {
      const extractedText = selectedFile ? await extractTextFromFile(selectedFile) : '';
      const rawTitle = selectedFile ? selectedFile.name.split('.')[0] : pastedText.substring(0, 30).trim();
      const { generateStudyMaterial } = await import('../services/aiService');
      const { deck, quiz, lesson } = await generateStudyMaterial(
        extractedText || pastedText, rawTitle, pastedText, 15, 'medium', 'both', 'gcse', 'General', undefined, (stage) => {}, true, isAdmin, 'standard'
      );
      setProgress(100);
      const aiSuggestedTitle = lesson?.audit_metadata?.title || rawTitle;
      const finalName = deriveName(aiSuggestedTitle, pastedText);
      setGeneratedLesson({ ...lesson, audit_metadata: { ...lesson.audit_metadata, title: finalName } });
      setGeneratedDeck({ ...deck, title: finalName });
      setGeneratedQuiz({ ...quiz, title: finalName });
      setLessonName(finalName);
      setIsSuccess(true);
      soundService.playSuccess();
      addToast({ icon: <Layers size={18} className="text-emerald-400" />, title: 'Forge Complete', body: 'Lesson and materials ready', color: 'bg-slate-900/90 border-emerald-500/30' });
    } catch (err: any) { setError(err.message || 'Error'); } finally { setIsGenerating(false); }
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
      {!hideTrigger && <button onClick={() => { setIsOpen(true); soundService.playClick(); }} className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl">Lesson Generator</button>}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div onClick={() => !isGenerating && setIsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div className="relative w-full max-w-2xl glass-card rounded-[2.5rem] p-12">
              {isSuccess ? (
                <div className="py-6 flex flex-col gap-8">
                  <div className="text-center text-white">Mastery Forged!</div>
                  <EditableName value={lessonName} onChange={handleNameChange} />
                  <button onClick={() => { setIsOpen(false); setIsSuccess(false); }} className="w-full py-4 bg-white/10 rounded-xl text-white">Exit</button>
                </div>
              ) : (
                <div className="space-y-8">
                  <textarea value={pastedText} onChange={e => setPastedText(e.target.value)} className="w-full h-80 bg-transparent p-8 text-white text-lg placeholder:text-stone-700 focus:outline-none resize-none" />
                  <button disabled={isGenerating || pastedText.trim().length < 20} onClick={generateLessonMaterial} className="w-full py-7 bg-white text-forge-dark rounded-[2rem]">Initialize Forge</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
