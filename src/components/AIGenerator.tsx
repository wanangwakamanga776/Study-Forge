import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, X, BrainCircuit, Trash2, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserStats } from '../types';
import { extractTextFromFile } from '../lib/extraction';
import { generateStudyMaterial, generateForgeCast, isAIConfigured } from '../services/aiService';
import { soundService } from '../services/soundService';

interface AIGeneratorProps {
  stats: UserStats;
  onGenerated: (type: 'flashcards' | 'quiz' | 'forgeCast', data: any) => void;
  onOpenPremium: () => void;
  onNavigate?: (view: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTopic?: string;
  hideTrigger?: boolean;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ 
  stats, 
  onGenerated, 
  onOpenPremium, 
  onNavigate, 
  isOpen: controlledIsOpen, 
  onOpenChange,
  initialTopic,
  hideTrigger
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill topic if provided
  React.useEffect(() => {
    if (initialTopic && isOpen) {
      setPastedText(initialTopic);
    }
  }, [initialTopic, isOpen]);

  const isLimitReached = () => {
    return false;
  };

  const handleFileSelect = (file: File) => {
    const allowedExtensions = [
      '.pdf', '.docx', '.doc', '.rtf', '.odt', '.pages', '.txt',
      '.pptx', '.ppt', '.ppsx', '.odp', '.key', '.potx'
    ];
    const fileName = file.name.toLowerCase();
    const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (isValid) {
      setSelectedFile(file);
      setError(null);
      soundService.playSuccess();
    } else {
      setError('Please upload a valid document or slide file.');
    }
  };

  const generateLessonMaterial = async () => {
    if (!selectedFile && !pastedText.trim()) {
      setError('Please provide some text or a file to analyze.');
      return;
    }

    if (isLimitReached()) {
      setIsOpen(false);
      onOpenPremium();
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingMessage('AI is performing a Semantic Audit...');
    soundService.playProcess();

    try {
      const extractedText = selectedFile ? await extractTextFromFile(selectedFile) : '';
      const title = selectedFile ? selectedFile.name.split('.')[0] : (pastedText.substring(0, 20).trim() || 'Custom Study Set');

      const lowerText = pastedText.toLowerCase();
      const isForgeCastRequest = lowerText.includes('video') || lowerText.includes('cast') || lowerText.includes('animation');

      if (isForgeCastRequest) {
        setLoadingMessage('Designing ForgeCast...');
        const blueprint = await generateForgeCast(extractedText || pastedText, title);
        onGenerated('forgeCast', blueprint);
      } else {
        // Use updated service with instructions
        const { deck, quiz } = await generateStudyMaterial(
          extractedText || pastedText, 
          title, 
          pastedText, // Pass entire text as instructions/content
          15, 
          'medium', 
          'both'
        );
        
        const hasCards = (deck.cards?.length || 0) > 0;
        const hasQuiz = (quiz.questions?.length || 0) > 0;

        if (hasCards) {
          onGenerated('flashcards', deck);
        }
        if (hasQuiz) {
          onGenerated('quiz', quiz);
        }

        if (!hasCards && !hasQuiz) {
          throw new Error("No study material could be extracted. Try providing more specific text.");
        }
      }

      setIsSuccess(true);
      soundService.playSuccess();
      // Removed auto-close to allow for refinement

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'The system was unable to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handleRefinement = async () => {
    if (!refinementInput.trim()) return;

    setIsRefining(true);
    soundService.playProcess();

    try {
      // Create a context string for the AI including original material and new request
      const context = `Previous Context: ${pastedText}\n\nRefinement Request: ${refinementInput}`;
      const title = selectedFile ? selectedFile.name.split('.')[0] : 'Expanded Study Set';

      const { deck, quiz } = await generateStudyMaterial(
        context, 
        title, 
        refinementInput, 
        10, 
        'hard', 
        'both'
      );

      if (deck.cards?.length) onGenerated('flashcards', deck);
      if (quiz.questions?.length) onGenerated('quiz', quiz);

      setRefinementInput('');
      soundService.playSuccess();
    } catch (err) {
      console.error('Refinement error:', err);
      setError('Could not expand material. Try a more specific request.');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => {
            setIsOpen(true);
            soundService.playClick();
          }}
          className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] font-display font-extrabold uppercase italic tracking-tighter"
        >
          <Sparkles size={20} className="text-forge-accent" />
          Lesson Generator
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
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-card rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            >
              <div className="p-6 sm:p-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-2 sm:p-3 bg-forge-accent/10 text-forge-accent rounded-xl sm:rounded-2xl forge-glow">
                    <Sparkles size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Lesson Architect</h2>
                    <p className="text-stone-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">Dynamic Educational Forge</p>
                  </div>
                </div>
                {!isGenerating && (
                  <button onClick={() => setIsOpen(false)} className="p-2 text-stone-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-12 metallic-scrollbar">
                {!isAIConfigured ? (
                  <div className="py-16 text-center">
                    <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                      <AlertCircle size={48} />
                    </div>
                    <h3 className="text-2xl font-extrabold font-display uppercase italic text-white mb-3">Setup Required</h3>
                    <p className="text-stone-400 mb-8 max-w-sm mx-auto">
                      AI Configuration needed. Please set your Gemini API Key in the environment secrets to start generating lessons.
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-8 py-3 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                    >
                      Close
                    </button>
                  </div>
                ) : isSuccess ? (
                  <div className="py-8 sm:py-12 flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 forge-glow"
                    >
                      <CheckCircle2 size={40} />
                    </motion.div>
                    <h3 className="text-xl sm:text-2xl font-extrabold font-display uppercase italic text-white mb-2">Mastery Forged</h3>
                    <p className="text-stone-400 mb-8 font-bold uppercase tracking-widest text-[10px] text-center">Your materials are live in the library.</p>
                    
                    <div className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-forge-accent" />
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-[.2em]">Oracle Expansion Active</span>
                      </div>
                      
                      <div className="relative group">
                        <textarea
                          placeholder="Ask the Oracle to expand or refine (e.g., 'Add 5 more items about ATP', 'Explain chemistry concepts further'...)"
                          value={refinementInput}
                          onChange={(e) => setRefinementInput(e.target.value)}
                          className="w-full h-32 bg-white/[0.02] border border-white/5 rounded-xl p-5 text-white text-sm placeholder:text-stone-700 focus:outline-none focus:border-white/10 transition-all resize-none shadow-inner"
                        />
                        <button
                          disabled={isRefining || !refinementInput.trim()}
                          onClick={handleRefinement}
                          className="absolute bottom-4 right-4 p-3 bg-white text-forge-dark rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-xl"
                        >
                          {isRefining ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setIsOpen(false);
                          setIsSuccess(false);
                          setSelectedFile(null);
                          setPastedText('');
                        }}
                        className="w-full py-4 bg-white/5 border border-white/5 rounded-xl text-stone-300 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em]"
                      >
                        Finish & Close Architect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="relative group bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden focus-within:border-white/20 transition-all shadow-inner flex flex-col">
                      <textarea
                        placeholder="What do you want to learn? Paste material or give instructions (e.g., 'Make 15 hard flashcards about Cellular Respiration' or 'Generate a quiz from this file'...)"
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full h-80 bg-transparent p-8 text-white text-lg font-medium placeholder:text-stone-700 focus:outline-none resize-none"
                      />
                      
                      <div className="p-6 flex items-center justify-between bg-white/[0.01] border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }} 
                            className="hidden" 
                            accept=".pdf,.docx,.doc,.txt,.pptx"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              selectedFile ? "bg-forge-accent text-forge-dark shadow-[0_0_15px_rgba(251,146,60,0.3)]" : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <Upload size={14} />
                            {selectedFile ? selectedFile.name : "Attach Material"}
                          </button>
                          {selectedFile && (
                            <button 
                              onClick={() => setSelectedFile(null)}
                              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                           <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 flex items-center gap-2">
                              <BrainCircuit size={12} className="text-forge-accent" />
                              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Oracle Active</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-500/20">
                          <AlertCircle size={18} />
                          {error}
                        </div>
                      )}

                      <button
                        disabled={isGenerating || (!pastedText.trim() && !selectedFile)}
                        onClick={generateLessonMaterial}
                        className="w-full py-7 bg-white text-forge-dark rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all font-display font-black uppercase italic tracking-tighter text-3xl flex items-center justify-center gap-4 shadow-[0_0_50px_rgba(255,255,255,0.15)] group"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={32} className="animate-spin" />
                            <span className="animate-pulse">{loadingMessage}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={32} className="group-hover:rotate-12 transition-transform" />
                            Forge Mastery
                          </>
                        )}
                      </button>
                      <p className="text-center text-[10px] text-stone-600 font-bold uppercase tracking-[0.2em] leading-relaxed">
                        High-efficiency algorithms will perform a Semantic Audit<br/>on your content automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
