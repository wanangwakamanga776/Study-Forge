import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, Volume2, VolumeX, 
  Monitor, CheckCircle2, XCircle, Sparkles, ChevronRight, Info,
  Send, Upload, Loader2, FileText, MessageSquare, Zap, Video
} from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import { ForgeCastBlueprint, ForgeCastChapter } from '../types';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';
import { generateId } from '../lib/utils';
import { isAIConfigured } from '../services/aiConfig';
import { useForgeStore } from '../contexts/ForgeStoreContext';

interface ForgeCastProps {
  blueprint?: ForgeCastBlueprint;
  onClose: () => void;
  onComplete: (xp: number) => void;
  onSaveBlueprint: (blueprint: ForgeCastBlueprint) => void;
  initialMode?: 'player' | 'agent';
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  blueprint?: ForgeCastBlueprint;
  file?: { name: string; content: string };
}

const RenderTextWithMath: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\$.*?\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const ForgeCast: React.FC<ForgeCastProps> = ({ 
  blueprint: initialBlueprint, 
  onClose, 
  onComplete, 
  onSaveBlueprint,
  initialMode = 'player'
}) => {
  const { processSessionCompletion } = useForgeStore();
  const [mode, setMode] = useState<'player' | 'agent'>(initialBlueprint ? initialMode : 'agent');
  const [currentBlueprint, setCurrentBlueprint] = useState<ForgeCastBlueprint | undefined>(initialBlueprint);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<'correct' | 'incorrect' | null>(null);

  // Agent State
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'agent', content: "Welcome! I am your Academic Video Assistant. Tell me a topic or upload a file, and I'll create a 5-scene educational lesson for you." }
  ]);
  const [input, setInput] = useState('');
  const [isForging, setIsForging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chapterDuration = 10;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !showAssessment && currentBlueprint) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (currentChapterIndex < currentBlueprint.chapters.length - 1) {
              setCurrentChapterIndex(prevIdx => prevIdx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              setShowAssessment(true);
              return 100;
            }
          }
          return prev + (100 / (chapterDuration * 10));
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentChapterIndex, showAssessment, currentBlueprint]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (mode === 'player') {
        if (e.key === 'ArrowLeft') {
          handleSkip('prev');
        } else if (e.key === 'ArrowRight') {
          handleSkip('next');
        } else if (e.key === ' ') {
          e.preventDefault();
          handlePlayPause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentChapterIndex, isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    soundService.playClick();
  };

  const handleSkip = (direction: 'next' | 'prev') => {
    if (!currentBlueprint) return;
    if (direction === 'next' && currentChapterIndex < currentBlueprint.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setProgress(0);
    } else if (direction === 'prev' && currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setProgress(0);
    }
    soundService.playClick();
  };

  const handleAssessmentSubmit = () => {
    if (selectedOption === null || !currentBlueprint) return;
    
    if (selectedOption === currentBlueprint.assessment.correct_index) {
      setAssessmentResult('correct');
      soundService.playSuccess();
      
      processSessionCompletion({
        session_type: 'forgecast_listened',
        session_duration_minutes: Math.ceil((currentBlueprint.chapters.length * chapterDuration) / 60),
        streak_continued: true
      }).then(res => {
        onComplete(res.embers_earned.total_earned * 5);
      });
    } else {
      setAssessmentResult('incorrect');
      soundService.playError();
      setTimeout(() => {
        setAssessmentResult(null);
        setSelectedOption(null);
      }, 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFile({ name: file.name, content });
      soundService.playClick();
    };
    reader.readAsText(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isForging) return;

    if (!isAIConfigured) {
      setMessages(prev => [...prev, 
        { id: Date.now().toString(), role: 'user', content: input },
        { id: (Date.now() + 1).toString(), role: 'agent', content: "Error: AI Configuration needed. Please set your Gemini API Key in the settings to begin your study session." }
      ]);
      setInput('');
      setUploadedFile(null);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      file: uploadedFile || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedFile(null);
    setIsForging(true);
    soundService.playClick();

    try {
      const { generateForgeCastFromChat } = await import('../services/aiService');
      const blueprint = await generateForgeCastFromChat(input, userMessage.file?.content);
      
      const finalBlueprint: ForgeCastBlueprint = {
        id: generateId(),
        createdAt: Date.now(),
        metadata: {
          title: blueprint.video_metadata.title,
          estimated_duration: blueprint.scenes.reduce((acc: number, s: any) => acc + s.duration_seconds, 0),
          theme_color: "#3B82F6"
        },
        chapters: blueprint.scenes.map((s: any) => ({
          chapter_id: Number(s.id),
          title: s.label,
          narration_text: s.narration,
          visual_ai_prompt: s.visual_prompt,
          image_url: s.image_url,
          screen_overlays: {
            text: s.screen_overlays?.text || [],
            latex_formula: s.screen_overlays?.latex_formula || ""
          },
          transition: "fade"
        })),
        assessment: {
          check_question: `What was the primary focus of ${blueprint.video_metadata.title}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correct_index: 0
        }
      };

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: blueprint.chat_acknowledgment,
        blueprint: finalBlueprint
      };

      setMessages(prev => [...prev, agentMessage]);
      onSaveBlueprint(finalBlueprint);
      soundService.playSuccess();
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: "I encountered an error generating this request. Please try again with a different topic."
      }]);
    } finally {
      setIsForging(false);
    }
  };

  const currentChapter = currentBlueprint?.chapters[currentChapterIndex];

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col overflow-hidden font-sans">
      {/* Cinematic Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-forge-accent/20 text-forge-accent rounded-lg">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-white font-display font-black uppercase italic tracking-tighter text-xl">
              {currentBlueprint?.metadata.title || "Academic Video Engine"}
            </h2>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">
              {mode === 'player' ? `Scene ${currentChapterIndex + 1} of ${currentBlueprint?.chapters.length}` : "Generating Lesson"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setMode(mode === 'player' ? 'agent' : 'player');
              soundService.playClick();
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'agent' ? "bg-forge-accent text-forge-dark" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {mode === 'player' ? <MessageSquare size={14} /> : <Play size={14} />}
            {mode === 'player' ? "Create Item" : "Return to Player"}
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-white transition-colors"
          >
            <XCircle size={32} />
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative flex items-center justify-center bg-[#050505]">
        <AnimatePresence mode="wait">
          {mode === 'player' ? (
            <motion.div
              key={currentChapterIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {!showAssessment && currentChapter ? (
                <>
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10" />
                    <img 
                      src={currentChapter.image_url || `https://picsum.photos/seed/${encodeURIComponent(currentChapter.title)}/1920/1080?blur=2`}
                      alt="Cinematic Background"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="relative z-10 w-full max-w-4xl px-12 text-center">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-8"
                    >
                      {currentChapter.screen_overlays.latex_formula && currentChapter.screen_overlays.latex_formula.trim() && (
                        <div className="text-5xl font-mono text-forge-accent forge-glow mb-12 py-8 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/5 flex items-center justify-center">
                          <BlockMath math={currentChapter.screen_overlays.latex_formula.replace(/^\$|\$$/g, '').trim()} />
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {currentChapter.screen_overlays.text.map((line, idx) => (
                          <motion.p
                            key={idx}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.8 + (idx * 0.2) }}
                            className="text-2xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-white drop-shadow-2xl"
                          >
                            <RenderTextWithMath text={line} />
                          </motion.p>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  <div className="absolute bottom-32 inset-x-0 px-12 text-center z-20">
                    <p className="text-stone-300 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed bg-black/60 backdrop-blur-md py-4 px-8 rounded-2xl border border-white/10 inline-block">
                      <RenderTextWithMath text={currentChapter.narration_text} />
                    </p>
                  </div>
                </>
              ) : showAssessment && currentBlueprint ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-2xl p-12 glass-card rounded-[3rem] border border-forge-accent/20"
                >
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-forge-accent/10 text-forge-accent rounded-full flex items-center justify-center mx-auto mb-6 forge-glow">
                      <Sparkles size={40} />
                    </div>
                    <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white mb-4">Knowledge Check</h3>
                    <p className="text-stone-400">{currentBlueprint.assessment.check_question}</p>
                  </div>

                  <div className="space-y-4 mb-12">
                    {currentBlueprint.assessment.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedOption(idx);
                          soundService.playClick();
                        }}
                        className={cn(
                          "w-full p-6 rounded-2xl border-2 text-left transition-all font-bold",
                          selectedOption === idx 
                            ? "border-forge-accent bg-forge-accent/10 text-white" 
                            : "border-white/5 bg-white/5 text-stone-400 hover:border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                            selectedOption === idx ? "bg-forge-accent text-forge-dark" : "bg-white/10 text-stone-500"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          {option}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={selectedOption === null || assessmentResult !== null}
                    onClick={handleAssessmentSubmit}
                    className="w-full py-6 forge-gradient text-forge-dark rounded-2xl font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {assessmentResult === 'correct' ? 'Correct ✓' : assessmentResult === 'incorrect' ? 'Try Again' : 'Verify Learning'}
                  </button>
                </motion.div>
              ) : (
                <div className="text-center">
                  <Video size={64} className="mx-auto text-stone-800 mb-6" />
                  <p className="text-stone-500 font-bold uppercase tracking-widest">No Blueprint Active</p>
                  <button 
                    onClick={() => setMode('agent')}
                    className="mt-6 px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest"
                  >
                    Create Item
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="agent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-4xl h-[80vh] flex flex-col glass-card rounded-[3rem] border border-white/5 overflow-hidden"
            >
              {/* Agent Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "p-6 rounded-[2rem] text-sm font-medium leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-forge-accent text-forge-dark rounded-tr-none" 
                          : "bg-white/5 text-stone-300 rounded-tl-none border border-white/5"
                      )}>
                        {msg.file && (
                          <div className="flex items-center gap-2 mb-3 p-3 bg-black/20 rounded-xl border border-white/10">
                            <FileText size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">{msg.file.name}</span>
                          </div>
                        )}
                        {msg.content}
                      </div>

                      {msg.blueprint && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-6 w-full glass-card rounded-[2rem] border border-forge-accent/30 overflow-hidden group"
                        >
                          <div className="aspect-video relative bg-stone-900">
                            <img 
                              src={msg.blueprint.chapters[0]?.image_url || `https://picsum.photos/seed/${encodeURIComponent(msg.blueprint.metadata.title)}/800/450`} 
                              alt="Blueprint Preview"
                              className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-t from-black/80 to-transparent">
                              <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-6">
                                {msg.blueprint.metadata.title}
                              </h3>
                              <button
                                onClick={() => {
                                  setCurrentBlueprint(msg.blueprint);
                                  setMode('player');
                                  setCurrentChapterIndex(0);
                                  setProgress(0);
                                  setShowAssessment(false);
                                  soundService.playClick();
                                }}
                                className="px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-transform forge-glow"
                              >
                                <Play size={20} fill="currentColor" />
                                Play Item
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isForging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 text-stone-500"
                  >
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Generating Lesson...</span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Agent Input */}
              <div className="p-8 border-t border-white/5 bg-black/40">
                {uploadedFile && (
                  <div className="mb-6 flex items-center justify-between p-4 bg-forge-accent/10 border border-forge-accent/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-forge-accent" />
                      <span className="text-xs font-black uppercase tracking-widest text-stone-300">{uploadedFile.name}</span>
                    </div>
                    <button onClick={() => setUploadedFile(null)} className="text-stone-500 hover:text-white">
                      <XCircle size={20} />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Describe a topic or upload a file..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-16 text-white placeholder-stone-600 focus:outline-none focus:border-forge-accent/50 transition-colors font-medium"
                  />
                    <label className="absolute left-5 top-1/2 -translate-y-1/2 p-2 text-stone-500 hover:text-forge-accent transition-colors cursor-pointer">
                      <Upload size={24} />
                      <input 
                        type="file" 
                        className="sr-only" 
                        onChange={handleFileUpload} 
                        onClick={(e) => { (e.target as any).value = null; }}
                        accept=".txt,.md" 
                      />
                    </label>
                  <button
                    onClick={handleSend}
                    disabled={isForging || (!input.trim() && !uploadedFile)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-forge-accent text-forge-dark rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 forge-glow"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic Controls (Only in Player Mode) */}
      {mode === 'player' && currentBlueprint && (
        <div className="p-8 bg-black border-t border-white/5 z-20">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-forge-accent forge-glow"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleSkip('prev')}
                    className="p-2 text-stone-500 hover:text-white transition-colors"
                  >
                    <SkipBack size={24} />
                  </button>
                  <button 
                    onClick={handlePlayPause}
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  <button 
                    onClick={() => handleSkip('next')}
                    className="p-2 text-stone-500 hover:text-white transition-colors"
                  >
                    <SkipForward size={24} />
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 text-stone-500 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="w-24 h-1 bg-white/10 rounded-full relative">
                    <div className="absolute inset-y-0 left-0 w-3/4 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-white font-mono text-sm tracking-tighter">
                    {Math.floor((currentChapterIndex * chapterDuration + (progress / 100) * chapterDuration))}s / {currentBlueprint.chapters.length * chapterDuration}s
                  </p>
                  <p className="text-stone-600 text-[10px] uppercase font-bold tracking-widest">Item Duration</p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
                  <Info size={16} className="text-stone-500 group-hover:text-forge-accent" />
                  <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Visual Prompt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
