import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Sparkles, Loader2, CheckCircle2, AlertCircle, X, BrainCircuit, Layers } from 'lucide-react';
import { FREE_LIMITS } from '../constants';
import { cn } from '../lib/utils';
import { Deck, Quiz, UserStats } from '../types';
import { extractTextFromPDF } from '../lib/extraction';
import { generateStudyMaterial } from '../services/aiService';

interface AIGeneratorProps {
  stats: UserStats;
  onGenerated: (type: 'flashcards' | 'quiz', data: any) => void;
  onOpenPremium: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export const AIGenerator: React.FC<AIGeneratorProps> = ({ stats, onGenerated, onOpenPremium }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Forge Controls
  const [quantity, setQuantity] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<'quiz' | 'flashcards'>('quiz');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLimitReached = () => {
    if (!stats || !stats.aiUsage) return false;
    if (stats.plan === 'Premium') return false;
    return mode === 'flashcards' 
      ? stats.aiUsage.flashcards >= FREE_LIMITS.flashcards
      : stats.aiUsage.quizzes >= FREE_LIMITS.quizzes;
  };

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload a PDF file.');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const forgeStudyMaterial = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    if (isLimitReached()) {
      setIsOpen(false);
      onOpenPremium();
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingMessage('Smelting PDF content...');

    try {
      const extractedText = await extractTextFromPDF(selectedFile);
      setLoadingMessage(`Forging ${quantity} ${mode}...`);

      const title = selectedFile.name.split('.')[0];
      const { deck, quiz } = await generateStudyMaterial(extractedText, title, quantity, difficulty, mode);
      
      if (mode === 'flashcards') {
        onGenerated('flashcards', deck);
      } else {
        onGenerated('quiz', quiz);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setSelectedFile(null);
      }, 2000);

    } catch (err: any) {
      console.error('Forge error:', err);
      setError(err.message || 'The forge has cooled. Please try again.');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const remaining = stats?.aiUsage ? (
    mode === 'flashcards' 
      ? FREE_LIMITS.flashcards - stats.aiUsage.flashcards
      : FREE_LIMITS.quizzes - stats.aiUsage.quizzes
  ) : 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] font-display font-extrabold uppercase italic tracking-tighter"
      >
        <Sparkles size={20} className="text-forge-accent" />
        Enter The Forge
      </button>

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
              className="relative w-full max-w-2xl glass-card rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-8 sm:p-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-forge-accent/10 text-forge-accent rounded-2xl forge-glow">
                      <Sparkles size={28} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Focus Forge</h2>
                      <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">AI Material Smelter</p>
                    </div>
                  </div>
                  {!isGenerating && (
                    <button onClick={() => setIsOpen(false)} className="text-stone-500 hover:text-white transition-colors">
                      <X size={28} />
                    </button>
                  )}
                </div>

                {isSuccess ? (
                  <div className="py-16 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 forge-glow"
                    >
                      <CheckCircle2 size={48} />
                    </motion.div>
                    <h3 className="text-2xl font-extrabold font-display uppercase italic text-white mb-3">Forging Complete</h3>
                    <p className="text-stone-400">Your materials have been added to the library.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {!selectedFile ? (
                      <div 
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "relative border-2 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all duration-500",
                          isDragging ? "border-forge-accent bg-forge-accent/5 scale-[1.02]" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        )}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
                          className="hidden" 
                          accept=".pdf"
                        />
                        <div className="flex flex-col items-center">
                          <div className="p-5 bg-white/5 text-stone-400 rounded-3xl mb-6 group-hover:text-forge-accent transition-colors">
                            <Upload size={40} />
                          </div>
                          <p className="text-xl font-bold text-white mb-2">Drop PDF into the Forge</p>
                          <p className="text-stone-500 text-sm">Or click to browse your blueprints</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/10">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-forge-accent/20 text-forge-accent rounded-2xl">
                              <FileText size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-white truncate max-w-[200px]">{selectedFile.name}</p>
                              <p className="text-xs text-stone-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Blueprint</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedFile(null)}
                            className="p-2 text-stone-500 hover:text-red-400 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setMode('quiz')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all",
                              mode === 'quiz' ? "border-forge-accent bg-forge-accent/10 forge-glow" : "border-white/5 bg-white/5 hover:border-white/10"
                            )}
                          >
                            <BrainCircuit size={24} className={mode === 'quiz' ? "text-forge-accent" : "text-stone-500"} />
                            <span className={cn("font-bold uppercase tracking-tighter", mode === 'quiz' ? "text-white" : "text-stone-500")}>Quiz Mode</span>
                          </button>
                          <button
                            onClick={() => setMode('flashcards')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all",
                              mode === 'flashcards' ? "border-forge-accent bg-forge-accent/10 forge-glow" : "border-white/5 bg-white/5 hover:border-white/10"
                            )}
                          >
                            <Layers size={24} className={mode === 'flashcards' ? "text-forge-accent" : "text-stone-500"} />
                            <span className={cn("font-bold uppercase tracking-tighter", mode === 'flashcards' ? "text-white" : "text-stone-500")}>Flashcards</span>
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Quantity: {quantity}</label>
                            <span className="text-[10px] text-stone-600 font-mono">5 - 50 Items</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="50" 
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="forge-slider"
                            style={{
                              // @ts-ignore
                              '--slider-height': `${2 + (quantity / 50) * 8}px`,
                              '--slider-bg': `rgba(251, 146, 60, ${0.1 + (quantity / 50) * 0.4})`
                            }}
                          />
                        </div>

                        {mode === 'quiz' && (
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Difficulty Level</label>
                            <div className="grid grid-cols-3 gap-3">
                              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setDifficulty(d)}
                                  className={cn(
                                    "py-3 rounded-xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all",
                                    difficulty === d ? {
                                      'easy': "border-[#22C55E] text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-[#22C55E]/5",
                                      'medium': "border-[#EAB308] text-[#EAB308] shadow-[0_0_15px_rgba(234,179,8,0.3)] bg-[#EAB308]/5",
                                      'hard': "border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-[#EF4444]/5"
                                    }[d] : "border-white/5 text-stone-600 hover:border-white/10"
                                  )}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-2">
                          <span className="text-stone-600">Forge Capacity</span>
                          <span className={cn(remaining <= 0 ? "text-red-500" : "text-forge-accent")}>
                            {stats?.plan === 'Premium' ? 'Unlimited' : `${remaining} Units Left`}
                          </span>
                        </div>

                        <button
                          disabled={isGenerating}
                          onClick={forgeStudyMaterial}
                          className="w-full py-5 forge-gradient text-forge-dark rounded-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-display font-extrabold uppercase italic tracking-tighter text-xl flex items-center justify-center gap-4 forge-glow"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={24} className="animate-spin" />
                              {loadingMessage}
                            </>
                          ) : (
                            <>
                              <Sparkles size={24} />
                              Forge Material
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-2xl text-sm border border-red-500/20">
                        <AlertCircle size={18} />
                        {error}
                      </div>
                    )}
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
