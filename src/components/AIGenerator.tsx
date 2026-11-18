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
          onClick={() => { setIsOpen(true); soundService.playClick(); }} 
          className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl hover:bg-stone-100 transition-colors shadow-lg font-bold"
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
              className="relative w-full max-w-2xl bg-stone-950/95 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh] no-scrollbar flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-forge-accent/10 rounded-xl border border-forge-accent/20">
                    <BrainCircuit className="text-forge-accent" size={22} />
                  </div>
                  <div>
                    <h2 className="font-display font-black uppercase italic tracking-tighter text-white text-xl sm:text-2xl leading-none">Study session</h2>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mt-1">Create lessons, flashcards, and quizzes</p>
                  </div>
                </div>
                {!isGenerating && (
                  <button 
                    onClick={() => { setIsOpen(false); soundService.playClick(); }}
                    className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {isGenerating ? (
                /* Dynamic Generating State */
                <div className="flex-1 py-12 flex flex-col items-center justify-center text-center space-y-8 my-auto">
                  <div className="relative">
                    <div className="absolute inset-0 bg-forge-accent/20 rounded-full blur-2xl animate-pulse" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="w-24 h-24 border-4 border-white/5 border-t-forge-accent rounded-full flex items-center justify-center relative z-10"
                    >
                      <Sparkles size={32} className="text-forge-accent animate-bounce" />
                    </motion.div>
                  </div>
                  
                  <div className="space-y-3 max-w-md">
                    <h3 className="font-display font-black uppercase italic tracking-tighter text-white text-2xl">Forging Mastery</h3>
                    <p className="text-forge-accent font-mono text-xs tracking-wider animate-pulse">{loadingMessage}</p>
                    <p className="text-white/40 text-[10px] leading-relaxed">Please do not close this window. Our AI Core is processing your request into modular curriculum slides, flashcards, and custom quizzes.</p>
                  </div>

                  {/* High-fidelity Progress Meter */}
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
                      <span>SYNAPSE CONNECTION</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div 
                        className="h-full bg-forge-accent shadow-[0_0_15px_rgba(251,146,60,0.8)]"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              ) : isSuccess ? (
                /* Success celebration state */
                <div className="flex-1 py-8 flex flex-col items-center justify-center text-center space-y-8 my-auto">
                  <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1 rounded-full font-black uppercase tracking-widest">Mastery Forged</span>
                    <h3 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter text-white pt-2 leading-none">Curriculum Integrated!</h3>
                    <p className="text-white/50 text-xs max-w-sm mx-auto leading-relaxed">Your lesson, interactive flashcard deck, and test simulation were built flawlessly. You can rename the lesson below.</p>
                  </div>

                  <div className="w-full max-w-md p-5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 text-left">LESSON SCHEMATIC NAME</p>
                    <EditableName value={lessonName} onChange={handleNameChange} />
                  </div>

                  <div className="w-full max-w-md flex flex-col gap-3 pt-4">
                    <button 
                      onClick={() => { 
                        setIsOpen(false); 
                        setIsSuccess(false); 
                        setSelectedFile(null);
                        setPastedText('');
                        soundService.playSuccess();
                      }} 
                      className="w-full py-4 bg-white text-forge-dark rounded-xl font-bold hover:bg-stone-100 transition-colors shadow-lg shadow-white/5"
                    >
                      Review My New Lesson
                    </button>
                    <button 
                      onClick={() => { 
                        setIsSuccess(false); 
                        setSelectedFile(null);
                        setPastedText('');
                        soundService.playClick();
                      }}
                      className="w-full py-4 bg-transparent border border-white/10 hover:bg-white/5 text-white/80 rounded-xl text-xs transition-colors"
                    >
                      Forge Another Topic
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
                      "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[160px]",
                      isDragging 
                        ? "border-forge-accent bg-forge-accent/10 scale-[0.99] shadow-[0_0_30px_rgba(251,146,60,0.15)]" 
                        : selectedFile 
                          ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10" 
                          : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
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
                      <div className="flex flex-col items-center space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                          <FileText size={28} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white max-w-xs truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-white/40 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • READY FOR COGNITIVE EXTRACTION</p>
                        </div>
                        <button 
                          onClick={removeSelectedFile}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-xs text-red-400 font-bold transition-all"
                        >
                          <Trash2 size={12} />
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white/5 rounded-xl text-white/50 mb-3 group-hover:text-forge-accent transition-colors">
                          <Upload size={24} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider text-white">Upload Study Source</p>
                        <p className="text-[10px] text-white/40 mt-1 max-w-xs leading-relaxed">Drag and drop documents, lectures, or textbook chapters here, or click to browse</p>
                        <p className="text-[8px] text-white/20 mt-3 font-mono">SUPPORTED: PDF, DOCX, TXT, PPTX, PAGES, RTF</p>
                      </>
                    )}
                  </div>

                  {/* Text Input Prompt */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50">
                      <span>{selectedFile ? "OPTIONAL CUSTOM INSTRUCTIONS" : "PASTE NOTES OR ENTER STUDY TOPIC"}</span>
                      <span>{pastedText.length} CHARS</span>
                    </div>
                    <div className="relative bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden focus-within:border-white/10 transition-colors">
                      <textarea 
                        value={pastedText} 
                        onChange={e => { setPastedText(e.target.value); if (error) setError(null); }} 
                        placeholder={
                          selectedFile 
                            ? "Optional: Give specific instruction to the AI (e.g. 'focus on Chapter 3 rules', 'explain using easy analogies', etc.)" 
                            : "Enter a subject (e.g. 'Quantum Physics principles', 'WW2 European Theater outline'), paste reference text, or list specific terms to forge a study guide..."
                        }
                        className="w-full h-36 sm:h-44 bg-transparent p-4 text-white text-sm placeholder:text-white/20 focus:outline-none resize-none leading-relaxed" 
                      />
                    </div>
                  </div>

                  {/* Error display */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400"
                    >
                      <AlertCircle className="shrink-0 mt-0.5" size={16} />
                      <div className="text-xs leading-relaxed font-semibold">{error}</div>
                    </motion.div>
                  )}

                  {/* Forge button */}
                  <div className="pt-2 shrink-0">
                    <button 
                      disabled={isGenerating || (!selectedFile && pastedText.trim().length < 20)} 
                      onClick={() => { generateLessonMaterial(); soundService.playClick(); }} 
                      className={cn(
                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg min-h-[48px]",
                        (!selectedFile && pastedText.trim().length < 20)
                          ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                          : "bg-[var(--sf-orange-500)] hover:bg-[var(--sf-orange-400)] text-black shadow-[0_0_28px_var(--sf-orange-glow)]"
                      )}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      Create study session
                    </button>
                    <p className="text-center text-xs text-white/40 mt-3">AI availability depends on configuration and plan limits. Saved materials remain accessible.</p>
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
