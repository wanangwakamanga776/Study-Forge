import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, X, BrainCircuit, Trash2, Send, Zap, ShieldCheck, Baby, CircleAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserStats } from '../types';
import { extractTextFromFile } from '../lib/extraction';
import { isAIConfigured } from '../services/aiConfig';
import { soundService } from '../services/soundService';
import { PyraMascot } from './PyraMascot';
import { useForgeStore } from '../contexts/ForgeStoreContext';

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
  stats, 
  onGenerated, 
  onOpenPremium, 
  onNavigate, 
  isOpen: controlledIsOpen, 
  onOpenChange,
  initialTopic,
  hideTrigger,
  isAdmin = false
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;
  const { processSessionCompletion } = useForgeStore();

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
  
  const [mode, setMode] = useState<'standard' | 'fast' | 'deep' | 'exam' | 'child'>('standard');

  const modes = [
    { id: 'standard', label: 'Normal Study', icon: <Sparkles size={14} />, desc: 'Perfect for general learning' },
    { id: 'fast', label: 'Quick Review', icon: <Zap size={14} />, desc: 'Just the big ideas' },
    { id: 'deep', label: 'Detailed Mastery', icon: <BrainCircuit size={14} />, desc: 'Learn every single detail' },
    { id: 'exam', label: 'Test Prep', icon: <ShieldCheck size={14} />, desc: 'Hard practice for real exams' },
    { id: 'child', label: 'Simple Mode', icon: <Baby size={14} />, desc: "Explain it like I'm 5" },
  ];

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

    if (pastedText.trim().length < 20) {
      setError('Please provide detailed instructions (at least 20 characters) for how to process the material.');
      return;
    }

    if (isLimitReached()) {
      setIsOpen(false);
      onOpenPremium();
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(10);
    setLoadingMessage('Initializing Forge...');
    soundService.playProcess();

    try {
      const extractedText = selectedFile ? await extractTextFromFile(selectedFile) : '';
      const isYoutube = youtubeUrl.trim().startsWith('http') && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'));
      
      const title = isYoutube ? 'YouTube Lesson' : selectedFile ? selectedFile.name.split('.')[0] : (pastedText.substring(0, 20).trim() || 'Custom Study Set');

      const quantityMatch = (pastedText || youtubeUrl).match(/(\d+)\s+(cards|flashcards|questions|items)/i);
      const userRequestedCount = quantityMatch ? Math.min(100, parseInt(quantityMatch[1])) : null;
      const requestedQuantity = userRequestedCount || (pastedText.length > 1500 ? 35 : 15);
      const isCountMandatory = !!userRequestedCount;

      const lowerText = pastedText.toLowerCase();
      const isForgeCastRequest = lowerText.includes('video') || lowerText.includes('cast') || lowerText.includes('animation');

      if (isForgeCastRequest) {
        setLoadingMessage('Designing ForgeCast...');
        setProgress(40);
        const { generateForgeCast } = await import('../services/aiService');
        const blueprint = await generateForgeCast(extractedText || pastedText, title);
        setProgress(100);
        onGenerated('forgeCast', blueprint);
      } else {
        const refinementMode = mode === 'child' ? 'Simple Mode (Easy to understand)' : 
                              mode === 'exam' ? 'Exam Prep (Detailed & realistic)' :
                              mode === 'deep' ? 'Deep Study (Complex & thorough)' :
                              mode === 'fast' ? 'Quick Review (Key points only)' : 'Standard';

        const { generateStudyMaterial } = await import('../services/aiService');

        const { deck, quiz, lesson } = await generateStudyMaterial(
          extractedText || pastedText, 
          title, 
          `${pastedText}\n\nMode: ${refinementMode}${isYoutube ? `\n\nYouTube Source: ${youtubeUrl}` : ''}`, 
          requestedQuantity, 
          mode === 'deep' ? 'hard' : mode === 'fast' ? 'easy' : 'medium', 
          'both',
          'gcse',
          'General',
          isYoutube ? youtubeUrl : undefined,
          (stage, message) => {
            // Precise stage mapping for a "cinematic" progress experience
            const messages: Record<string, string> = {
              'auditing': 'Performing Deep Semantic Audit...',
              'cards': 'Forging High-Yield Flashcards...',
              'quiz': 'Constructing Rigorous Quiz Layers...',
              'finalizing': 'Finalizing Lesson Artifacts...',
              'extracting': 'Extracting Cognitive Patterns...'
            };
            
            setLoadingMessage(messages[stage] || message);
            
            // Smoother progress curve
            const mapping: Record<string, number> = {
              'extracting': 15,
              'auditing': 35,
              'cards': 65,
              'quiz': 88,
              'finalizing': 96
            };
            setProgress(mapping[stage] || 50);
          },
          isCountMandatory,
          isAdmin
        );
        
        setProgress(100);
        
        const hasCards = (deck.cards?.length || 0) > 0;
        const hasQuiz = (quiz.questions?.length || 0) > 0;

        if (lesson) {
          onGenerated('lesson', lesson);
        }
        if (hasCards) {
          onGenerated('flashcards', deck);
        }
        if (hasQuiz) {
          onGenerated('quiz', quiz);
        }

        // Award Embers for Successful Upload/Generation
        await processSessionCompletion({
          session_type: 'upload_completed',
          session_duration_minutes: 2, // Arbitrary for generation
          streak_continued: true
        });

        if (!hasCards && !hasQuiz) {
          throw new Error("No study material could be extracted. Try providing more specific text.");
        }
      }

      setIsSuccess(true);
      soundService.playSuccess();
      // Removed auto-close to allow for refinement

    } catch (err: any) {
      console.error('Generation error:', err);
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        setError('You have exceeded your API usage quota. Please wait a while before generating more material, or check your billing plan.');
      } else {
        setError(err.message || 'The system was unable to generate content. Please try again.');
      }
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

      const refinementQuantityMatch = refinementInput.match(/(\d+)\s+(cards|flashcards|questions|items)/i);
      const refinementQuantity = refinementQuantityMatch ? Math.min(20, parseInt(refinementQuantityMatch[1])) : 10;
      const refinementIsMandatory = !!refinementQuantityMatch;

      const { generateStudyMaterial } = await import('../services/aiService');
      const { deck, quiz } = await generateStudyMaterial(
        context, 
        title, 
        refinementInput, 
        refinementQuantity, 
        'hard', 
        'both',
        'gcse',
        'General',
        undefined,
        undefined,
        refinementIsMandatory
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
                    <h2 className="text-xl sm:text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Lesson Generator</h2>
                    <p className="text-stone-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">Instantly turn any material into a study plan</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                      {modes.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMode(m.id as any);
                            if (m.id === 'child') {
                              setPastedText(prev => prev + "\nExplain everything in simple, everyday language that a 12 year old can understand.");
                            }
                          }}
                          className={cn(
                            "p-4 rounded-3xl border-2 transition-all text-left relative overflow-hidden group",
                            mode === m.id 
                              ? "bg-forge-accent/10 border-forge-accent text-forge-accent" 
                              : "bg-white/5 border-white/5 text-stone-500 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {m.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                          </div>
                          <p className="text-[8px] font-bold uppercase tracking-widest leading-tight opacity-60">{m.desc}</p>
                          {mode === m.id && (
                            <motion.div 
                              layoutId="active-mode" 
                              className="absolute top-0 right-0 w-8 h-8 bg-forge-accent/20 rounded-bl-full flex items-center justify-center"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-forge-accent" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>

                    {isAdmin && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-forge-accent" />
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">YouTube Integration</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Paste YouTube Video Link (Optional)..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-stone-700 focus:outline-none focus:border-forge-accent/50 transition-all shadow-inner"
                      />
                    </div>
                    )}

                    <div className="flex flex-col gap-4">
                       <div className="flex justify-between items-center px-4">
                         <div className="flex items-center gap-4">
                           <span className={cn(
                             "text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border transition-all",
                             pastedText.trim().length < 20 ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                           )}>
                             {pastedText.trim().length} / 20 Characters
                           </span>
                           {pastedText.trim().length < 20 && (
                             <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                               Minimum 20 instructions required
                             </span>
                           )}
                         </div>
                         {selectedFile && pastedText.trim().length === 0 && (
                           <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                             <CircleAlert size={12} />
                             Instructions required for file
                           </span>
                         )}
                       </div>

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
                            onClick={(e) => {
                              (e.target as any).value = null;
                            }}
                            className="sr-only" 
                            accept=".pdf,.docx,.doc,.txt,.pptx"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
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
                  </div>

                  <div className="flex flex-col gap-4">
                      {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl text-xs font-bold uppercase tracking-widest border border-red-500/20">
                          <AlertCircle size={18} />
                          {error}
                        </div>
                      )}

                      <button
                        disabled={isGenerating || pastedText.trim().length < 20}
                        onClick={generateLessonMaterial}
                        className="w-full py-7 bg-white text-forge-dark rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all font-display font-black uppercase italic tracking-tighter text-3xl flex items-center justify-center gap-4 shadow-[0_0_50px_rgba(255,255,255,0.15)] group"
                      >
                        {isGenerating ? (
                          <div className="flex flex-col items-center gap-6 w-full px-8 py-10 relative overflow-hidden">
                             {/* Cinematic Background Particles */}
                            <div className="absolute inset-0 z-0 pointer-events-none">
                              {[...Array(20)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ 
                                    opacity: 0, 
                                    x: Math.random() * 400 - 200, 
                                    y: Math.random() * 400 - 200,
                                    scale: Math.random() * 2
                                  }}
                                  animate={{ 
                                    opacity: [0, 0.4, 0],
                                    y: Math.random() * 400 - 200,
                                    x: Math.random() * 400 - 200
                                  }}
                                  transition={{ 
                                    duration: 3 + Math.random() * 2, 
                                    repeat: Infinity,
                                    delay: Math.random() * 2
                                  }}
                                  className="absolute w-2 h-2 bg-forge-accent/20 blur-xl rounded-full"
                                />
                              ))}
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-8 w-full">
                              <PyraMascot expression="thinking" message={loadingMessage} />
                              
                              <div className="w-full space-y-6">
                                <div className="flex justify-between items-end mb-1">
                                  <div className="flex flex-col items-start gap-1">
                                     <span className="text-[9px] font-black text-forge-accent uppercase tracking-[0.3em] animate-pulse">Deep Forge Protocol Active</span>
                                     <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{loadingMessage}</span>
                                  </div>
                                  <span className="text-4xl font-display font-black italic text-white drop-shadow-[0_0_20px_rgba(251,146,60,0.3)]">{progress}%</span>
                                </div>
                                
                                <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 relative p-1 shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", bounce: 0, duration: 1 }}
                                    className="h-full bg-gradient-to-r from-forge-accent via-forge-accent/80 to-white rounded-full shadow-[0_0_30px_rgba(251,146,60,0.6)] relative"
                                  >
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer" />
                                  </motion.div>
                                </div>

                                <div className="flex justify-center gap-3">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <motion.div
                                      key={i}
                                      animate={{ 
                                        opacity: progress >= (i * 20) ? 1 : 0.1,
                                        scale: progress >= (i * 20) ? [1, 1.3, 1] : 1
                                      }}
                                      className="w-1.5 h-1.5 rounded-full bg-forge-accent"
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
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
                      <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-stone-700 mt-2">
                        <span>Daily Limit Status: Dynamic</span>
                        <div className="w-1 h-1 rounded-full bg-stone-800" />
                        <span>Next Reset: 00:00 UTC</span>
                      </div>
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
