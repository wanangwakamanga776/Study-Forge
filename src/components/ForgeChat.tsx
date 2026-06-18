import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Paperclip, Loader2, User, BookOpen, FileText, Trash2, Zap, Layers, BrainCircuit, Sparkles, Shield, GraduationCap, Flame, Terminal, HelpCircle } from 'lucide-react';
import { isAIConfigured } from '../services/aiConfig';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { extractTextFromFile } from '../lib/extraction';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn, generateId } from '../lib/utils';
import { soundService } from '../services/soundService';
import { ForgePersona, LessonArchitectAudit } from '../types';
import { PyraMascot } from './PyraMascot';
import { chatWithAcademicAssistant } from '../services/aiService';
import { getGenericLocalDB, saveGenericLocalDB } from '../services/storageManager';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ForgeChatProps {
  onNavigate?: (view: any) => void;
  onOpenForge?: (topic?: string) => void;
  onSaveData?: (type: 'flashcards' | 'quiz' | 'forgeCast' | 'lesson', data: any) => void;
  onEditData?: (type: 'flashcards' | 'quiz', data: any) => void;
  onAddData?: (type: 'flashcards' | 'quiz', data: any) => void;
  activeLesson?: LessonArchitectAudit;
}

const PERSONA_LABELS: Record<ForgePersona, { label: string; icon: any; color: string; description: string }> = {
  pyra_default: { 
    label: 'Pyra', 
    icon: Sparkles, 
    color: 'text-forge-accent',
    description: 'Your general study buddy. Balanced, direct, and helpful.'
  },
  forge_master: { 
    label: 'Forge Master', 
    icon: Shield, 
    color: 'text-red-400',
    description: 'Intense exam mode. Fast-paced, strict, and focused on pure facts.'
  },
  vault_scholar: { 
    label: 'Vault Scholar', 
    icon: GraduationCap, 
    color: 'text-blue-400',
    description: 'Deep learning mode. Explores the "why" and hidden connections.'
  },
  ember_coach: { 
    label: 'Ember Coach', 
    icon: Flame, 
    color: 'text-orange-500',
    description: 'Motivation mode. Focused on rewards, streaks, and progress.'
  },
  spark_mode: { 
    label: 'Spark Mode', 
    icon: Terminal, 
    color: 'text-yellow-400',
    description: 'Active recall mode. Pyra asks the questions to test your brain.'
  }
};

export function ForgeChat({ onNavigate, onOpenForge, onSaveData, onEditData, onAddData, activeLesson }: ForgeChatProps) {
  const { unlockTheme, setTheme, currentTheme, addBadge, badges, stats, decks, lessons, activeAssistantSkin } = useForgeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<ForgePersona>('pyra_default');
  const [showHelp, setShowHelp] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let isMounted = true;
    getGenericLocalDB('forge_chat_history').then(saved => {
      if (isMounted) {
        if (saved && saved.length > 0) {
          setMessages(saved);
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      saveGenericLocalDB('forge_chat_history', messages);
    }
  }, [messages]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [focusCount, setFocusCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Pyra based on persona and skin
  useEffect(() => {
    if (messages.length === 0) {
      const SKIN_GREETINGS: Record<string, string>|any = {
        'Ghost Protocol': "Asset identified. Ghost Protocol active. State your coordinates.",
        'Oracle Prime': "I have seen this arrival before. The pattern is clear. Ask, and the archive answers.",
        'Circuit Breaker': "Processing. Circuit Breaker online. Efficiency: low. Recalibrating. Input topic now.",
        'The Archivist': "Ah, another entry in our shared archive! Scholarly parameters set. What shall we cross-reference today?",
        'Forge Wraith': "This is where most quit. The forge is hottest right before the metal holds. Begin your transformation."
      };

      const initialGreeting = activeAssistantSkin && SKIN_GREETINGS[activeAssistantSkin] 
        ? SKIN_GREETINGS[activeAssistantSkin]
        : (persona === 'pyra_default' ? "Warm, direct, intelligent. I am Pyra — your academic tutor. What are we mastering today?" :
           persona === 'forge_master' ? "Precision and discipline. I am the Forge Master. You have work to do. State your topic." :
           persona === 'vault_scholar' ? "Greetings, scholar. I have been exploring the depths of your material. What connections shall we unveil today?" :
           persona === 'ember_coach' ? "Let's win the day! I'm your Ember Coach. Ready to turn focus into progress?" :
           "Socratic dialogue initiated. Spark Mode active. What do you believe is the core of our next topic?");
      
      setMessages([{ role: 'model', content: initialGreeting }]);
    }
  }, [persona, messages.length, activeAssistantSkin]);

  // Construct Student Profile for AI context
  const getStudentProfile = useCallback(() => {
    const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
    const matureCards = decks.reduce((acc, d) => acc + d.cards.filter(c => c.interval >= 21).length, 0);
    const weakTopics = lessons
      .filter(l => (l.mastery_score || 0) < 60)
      .map(l => l.audit_metadata.title);

    return {
      name: stats.studentName || 'Student',
      level: stats.level || 'gcse',
      upcoming_exam: stats.upcomingExams?.[0] || null,
      srs_data: {
        total_cards: totalCards,
        mature_cards: matureCards,
        retention_rate: "85%", // Mocked for now
        weak_topics: weakTopics
      },
      gamification: {
        streak: stats.streak || 0,
        embers: stats.embers || 0,
        rank: stats.rank || 'Novice'
      }
    };
  }, [stats, decks, lessons]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Easter Egg Tracker
  useEffect(() => {
    if (focusCount >= 5) {
      unlockTheme('Matrix Code');
      setTheme('Matrix Code');
      addBadge('Digital Alchemist');
      setMessages(prev => [...prev, { role: 'model', content: "SYSTEM BREACH DETECTED... Redirecting to the Matrix. Secret 'Matrix Code' theme unlocked for free! [[ACTION:THEME:Matrix Code]]" }]);
      setFocusCount(0);
      soundService.playSuccess();
    }
  }, [focusCount, unlockTheme, setTheme, addBadge]);

  const handleSend = async () => {
    if (!input.trim() && !fileContent) return;
    if (!isAIConfigured) {
      alert("AI Configuration needed. Please set your API Key in the settings to activate Pyra.");
      return;
    }

    const trimmedInput = input.trim();
    if (trimmedInput.toLowerCase() === 'focus') {
      setFocusCount(prev => prev + 1);
    } else {
      setFocusCount(0);
    }

    const userMessage = trimmedInput || (fileContent ? `I've uploaded a file: ${fileName}. Please analyze it.` : '');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    soundService.playClick();

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const studentProfile = getStudentProfile();
      const response = await chatWithAcademicAssistant(
        userMessage, 
        history, 
        studentProfile, 
        persona, 
        activeAssistantSkin || 'Default',
        activeLesson, 
        fileContent || undefined
      );
      
      setMessages(prev => [...prev, { role: 'model', content: response }]);
      
      // Process Actions
      if (response.includes('[[ACTION:')) {
        setTimeout(() => handleAction(response), 500);
      }
    } catch (error) {
       setMessages(prev => [...prev, { role: 'model', content: "I apologize, but I encountered an error processing your request. " + (error as Error).message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = useCallback((content: string) => {
    // 1. Fallback for "Open Lab" format if AI ignores protocol
    if (content.includes('Open Lab:')) {
      const openLabMatches = content.match(/Open Lab:\s*({[\s\S]+?})(?=\s*Open Lab:|$|\[\[)/g);
      if (openLabMatches) {
        openLabMatches.forEach(match => {
           try {
             const jsonMatch = match.match(/{[\s\S]+?}/);
             if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0].trim());
                if (data.cards) {
                  onSaveData?.('flashcards', data);
                  soundService.playSuccess();
                } else if (data.questions) {
                  onSaveData?.('quiz', data);
                  soundService.playSuccess();
                } else if (data.addCards && onAddData) {
                  onAddData('flashcards', { ...data, cards: data.addCards });
                  soundService.playSuccess();
                } else if (data.addQuestions && onAddData) {
                  onAddData('quiz', { ...data, questions: data.addQuestions });
                  soundService.playSuccess();
                }
             }
           } catch (e) {
             console.log("Open Lab fallback parse failed");
           }
        });
      }
      
      if (content.toLowerCase().includes('open lab: flashcards') && onNavigate) {
        onNavigate('flashcards');
        soundService.playSuccess();
      }
      if (content.toLowerCase().includes('open lab: quiz') && onNavigate) {
        onNavigate('quiz');
        soundService.playSuccess();
      }
    }

    // 2. Protocol Actions: SAVE_DECK
    const saveDeckMatches = content.match(/\[\[ACTION:SAVE_DECK:([\s\S]+?)\]\]/g);
    if (saveDeckMatches && onSaveData) {
      saveDeckMatches.forEach(match => {
        try {
          const jsonStr = match.match(/SAVE_DECK:([\s\S]+?)$/)?.[1]?.replace(/\]\]$/, '');
          if (jsonStr) {
            const data = JSON.parse(jsonStr.trim());
            onSaveData('flashcards', data);
            soundService.playSuccess();
          }
        } catch (e) {
          console.error("Failed to parse SAVE_DECK action", e);
        }
      });
    }

    // 3. Protocol Actions: ADD_TO_DECK / ADD_TO_QUIZ
    const addDeckMatches = content.match(/\[\[ACTION:ADD_TO_DECK:([\s\S]+?)\]\]/g);
    if (addDeckMatches && onAddData) {
      addDeckMatches.forEach(match => {
        try {
          const jsonStr = match.match(/ADD_TO_DECK:([\s\S]+?)$/)?.[1]?.replace(/\]\]$/, '');
          if (jsonStr) {
            const data = JSON.parse(jsonStr.trim());
            onAddData('flashcards', data);
            soundService.playSuccess();
          }
        } catch (e) {
          console.error("Failed to parse ADD_TO_DECK action", e);
        }
      });
    }

    const addQuizMatches = content.match(/\[\[ACTION:ADD_TO_QUIZ:([\s\S]+?)\]\]/g);
    if (addQuizMatches && onAddData) {
      addQuizMatches.forEach(match => {
        try {
          const jsonStr = match.match(/ADD_TO_QUIZ:([\s\S]+?)$/)?.[1]?.replace(/\]\]$/, '');
          if (jsonStr) {
            const data = JSON.parse(jsonStr.trim());
            onAddData('quiz', data);
            soundService.playSuccess();
          }
        } catch (e) {
          console.error("Failed to parse ADD_TO_QUIZ action", e);
        }
      });
    }

    // 4. Edit Actions
    const editDeckMatches = content.match(/\[\[ACTION:EDIT_DECK:([\s\S]+?)\]\]/g);
    if (editDeckMatches && onEditData) {
      editDeckMatches.forEach(match => {
        try {
          const jsonStr = match.match(/EDIT_DECK:([\s\S]+?)$/)?.[1]?.replace(/\]\]$/, '');
          if (jsonStr) {
            const data = JSON.parse(jsonStr.trim());
            onEditData('flashcards', data);
            soundService.playSuccess();
          }
        } catch (e) {
          console.error("Failed to parse EDIT_DECK action", e);
        }
      });
    }

    const editQuizMatches = content.match(/\[\[ACTION:EDIT_QUIZ:([\s\S]+?)\]\]/g);
    if (editQuizMatches && onEditData) {
      editQuizMatches.forEach(match => {
        try {
          const jsonStr = match.match(/EDIT_QUIZ:([\s\S]+?)$/)?.[1]?.replace(/\]\]$/, '');
          if (jsonStr) {
            const data = JSON.parse(jsonStr.trim());
            onEditData('quiz', data);
            soundService.playSuccess();
          }
        } catch (e) {
          console.error("Failed to parse EDIT_QUIZ action", e);
        }
      });
    }

    // 5. Navigation Action (Process LAST)
    const navMatches = content.match(/\[\[ACTION:NAVIGATE:[-\w]+\]\]/g);
    if (navMatches && onNavigate) {
      navMatches.forEach(match => {
        const view = match.match(/NAVIGATE:([-\w]+)/)?.[1];
        if (view) onNavigate(view);
      });
      soundService.playSuccess();
    }
  }, [onNavigate, onEditData, onAddData, onSaveData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      setFileContent(text);
      soundService.playSuccess();
    } catch (error) {
      alert("Error reading file: " + (error as Error).message);
      setFileName(null);
      setFileContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          soundService.playClick();
        }}
        className="fixed bottom-32 right-6 w-16 h-16 bg-forge-accent text-forge-dark rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.4)] hover:scale-110 active:scale-95 transition-all z-[10000] group"
      >
        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
        <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-forge-accent rounded-full -z-10"
        />
      </button>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full max-w-md bg-forge-dark border-l-4 border-forge-accent/40 shadow-[0_0_50px_rgba(251,146,60,0.15)] z-[70] flex flex-col"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 mr-3">
                        <PyraMascot 
                          persona={persona}
                          expression={isLoading ? 'thinking' : 'happy'}
                          className="scale-[0.65] origin-top-left"
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Pyra Vault</h3>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{PERSONA_LABELS[persona].label} Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-2 text-stone-500 hover:text-white transition-colors relative"
                        title="How this Vault works"
                      >
                        <HelpCircle size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          setMessages([]);
                          soundService.playClick();
                        }}
                        className="p-2 text-stone-500 hover:text-red-400 transition-colors"
                        title="Reset Session"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-stone-500 hover:text-white transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>

                  {/* Persona Switcher */}
                  <div className="flex gap-2 overflow-x-auto pb-3 px-1 metallic-scrollbar">
                    {(Object.entries(PERSONA_LABELS) as [ForgePersona, any][]).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setPersona(key);
                          setMessages([]); // Reset to trigger new greeting
                          soundService.playClick();
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all whitespace-nowrap flex items-center gap-2",
                          persona === key 
                            ? "bg-forge-accent/20 border-forge-accent text-forge-accent" 
                            : "bg-white/5 border-white/5 text-stone-500 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {(() => {
                          const Icon = config.icon;
                          return <Icon size={12} />;
                        })()}
                        {config.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1 px-1">
                    <p className="text-[10px] text-stone-500 font-medium italic">
                      {PERSONA_LABELS[persona].description}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {showHelp && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute top-28 left-4 right-4 bg-forge-dark/95 backdrop-blur-xl border border-forge-accent/30 rounded-2xl p-6 shadow-2xl z-50 overflow-y-auto max-h-[60vh] metallic-scrollbar"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-forge-accent font-black uppercase tracking-widest text-sm flex items-center gap-2">
                          <HelpCircle size={16} /> Vault Features Guide
                        </h4>
                        <button onClick={() => setShowHelp(false)} className="text-stone-400 hover:text-white">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-4 text-sm text-stone-300">
                        <div className="space-y-1">
                          <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Flame size={14} className="text-forge-accent"/> Personas</h5>
                          <p className="text-xs">Pyra can switch teaching styles using the buttons above. E.g., <span className="text-forge-accent">Forge Master</span> is strict, <span className="text-purple-400">Vault Scholar</span> uses Socratic method.</p>
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-blue-400"/> General Chat</h5>
                          <p className="text-xs">Chat naturally about any topic just like standard AI assistants (ChatGPT, Claude, Gemini).</p>
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Paperclip size={14} className="text-pink-400"/> Upload Docs</h5>
                          <p className="text-xs">Click the paperclip below to upload your notes, PDFs, or PPTXs. Pyra will read them and answer questions, create flashcards, or quiz you on them.</p>
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-yellow-400"/> Quick Actions</h5>
                          <p className="text-xs">Ask Pyra to "generate a quiz on biology" or "make 10 flashcards about math" and she'll create cards directly in this chat that you can save to your library.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages */}
                <div 
                  ref={scrollRef} 
                  tabIndex={0}
                  className="flex-1 overflow-y-auto p-6 space-y-6 metallic-scrollbar pb-24 focus:outline-none"
                  aria-label="Chat messages"
                >
                {messages.map((message, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      message.role === 'user' ? "bg-white/5 text-white" : "bg-forge-accent text-forge-dark"
                    )}>
                      {message.role === 'user' ? <User size={16} /> : <BookOpen size={16} />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === 'user' 
                        ? "bg-white/5 text-white rounded-tr-none" 
                        : "bg-white/[0.03] text-stone-300 border border-white/5 rounded-tl-none pr-8 relative"
                    )}>
                      <div className="prose prose-invert prose-sm overflow-x-auto">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {message.content
                            .replace(/\[\[ACTION:.*?\]\]/g, '')
                            .replace(/\[\[DATA:.*?\]\]/g, '')
                            .replace(/\[OPEN_PLANNER\]/g, '')
                            .replace(/\[OPEN_VAULT\]/g, '')
                            .replace(/\[OPEN_FORGECAST\]/g, '')
                          }
                        </ReactMarkdown>
                      </div>
                      
                      {/* Data & Action Triggers */}
                      {message.role === 'model' && (
                        <div className="mt-4 flex flex-col gap-4">
                          {/* Navigation Shortcuts */}
                          <div className="flex flex-wrap gap-2">
                            {message.content.includes('[OPEN_PLANNER]') && (
                              <button 
                                onClick={() => onNavigate?.('planner')}
                                className="px-3 py-1.5 bg-forge-accent/20 text-forge-accent border border-forge-accent/30 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-forge-accent hover:text-forge-dark transition-all"
                              >
                                Go to Planner
                              </button>
                            )}
                            {message.content.includes('[OPEN_VAULT]') && (
                              <button 
                                onClick={() => onNavigate?.('vault')}
                                className="px-3 py-1.5 bg-forge-accent/20 text-forge-accent border border-forge-accent/30 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-forge-accent hover:text-forge-dark transition-all"
                              >
                                Go to Vault
                              </button>
                            )}
                            {message.content.includes('[OPEN_FORGECAST]') && (
                              <button 
                                onClick={() => onNavigate?.('forgecast')}
                                className="px-3 py-1.5 bg-forge-accent/20 text-forge-accent border border-forge-accent/30 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-forge-accent hover:text-forge-dark transition-all"
                              >
                                Go to ForgeCast
                              </button>
                            )}
                          </div>
                          {/* Data Payload Cards */}
                          {message.content.match(/\[\[DATA:(.*?):(.*?)\]\]/g)?.map((dataRaw, idx) => {
                            try {
                                const match = dataRaw.match(/\[\[DATA:(.*?):(.*?)\]\]/);
                                if (!match) return null;
                                const [_, type, jsonStr] = match;
                                const data = JSON.parse(jsonStr);
                                
                                return (
                                  <motion.div 
                                    key={`data-${idx}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 bg-white/5 border border-forge-accent/20 rounded-2xl space-y-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-forge-accent/20 text-forge-accent rounded-lg">
                                        {type === 'FLASHCARDS' ? <Layers size={16} /> : <BrainCircuit size={16} />}
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-tighter">{data.title || 'Untitled Forge'}</p>
                                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                                          {type === 'FLASHCARDS' ? `${data.cards?.length || 0} Cards` : `${data.questions?.length || 0} Questions`}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        soundService.playSuccess();
                                        if (type === 'FLASHCARDS') {
                                          onSaveData?.('flashcards', {
                                            id: generateId(),
                                            ...data,
                                            cards: (data.cards || []).map((c: any) => ({ ...c, id: generateId() })),
                                            createdAt: Date.now()
                                          });
                                        } else if (type === 'QUIZ') {
                                          onSaveData?.('quiz', {
                                            id: generateId(),
                                            ...data,
                                            questions: (data.questions || []).map((q: any) => ({ ...q, id: generateId() })),
                                            createdAt: Date.now()
                                          });
                                        }
                                      }}
                                      className="w-full py-2 bg-forge-accent text-forge-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_10px_rgba(251,146,60,0.2)]"
                                    >
                                      Save to Library
                                    </button>
                                  </motion.div>
                                );
                            } catch (e) {
                                return null;
                            }
                          })}

                          {/* Quick Action Buttons */}
                          {message.content.includes('[[ACTION:') && (
                            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                                {message.content.match(/\[\[ACTION:(.*?):(.*?)\]\]/g)?.map((actionRaw, idx) => {
                                const match = actionRaw.match(/\[\[ACTION:(.*?):(.*?)\]\]/);
                                if (!match) return null;
                                const [_, type, value] = match;

                                return (
                                    <button
                                    key={`action-${idx}`}
                                    onClick={() => {
                                        soundService.playSuccess();
                                        if (type === 'FLASHCARDS' || type === 'QUIZ') {
                                        onOpenForge?.(value);
                                        } else if (type === 'TIMER') {
                                        onNavigate?.('timer');
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-white/5 text-stone-400 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-forge-accent/20 hover:text-forge-accent hover:border-forge-accent/30 transition-all flex items-center gap-2"
                                    >
                                    <Zap size={12} strokeWidth={3} />
                                    Open Lab: {value}
                                    </button>
                                );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-forge-accent text-forge-dark flex items-center justify-center animate-pulse">
                      <Sparkles size={16} />
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-forge-accent" />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Oracle computing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white/[0.02] border-t border-white/5 relative">
                <div className="max-w-2xl mx-auto space-y-4">
                  {fileContent && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-between p-3 bg-forge-accent/10 rounded-xl border border-forge-accent/20"
                    >
                      <div className="flex items-center gap-2">
                          <FileText size={16} className="text-forge-accent" />
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">{fileName}</span>
                      </div>
                      <button 
                          onClick={() => {
                              setFileContent(null);
                              setFileName(null);
                          }}
                          className="text-stone-500 hover:text-red-500"
                      >
                          <Trash2 size={16} />
                      </button>
                    </motion.div>
                  )}
                  
                  <div className="relative flex items-end gap-2 bg-white/[0.05] border border-white/10 rounded-[1.5rem] p-2 focus-within:border-forge-accent/30 transition-all">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      onClick={(e) => { (e.target as any).value = null; }}
                      className="sr-only"
                      accept=".pdf,.docx,.doc,.txt,.pptx,.rtf,.odt"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-stone-400 hover:text-white transition-all rounded-xl"
                      title="Upload Document"
                    >
                      <Paperclip size={22} />
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Message Academic Oracle..."
                      rows={1}
                      className="flex-1 bg-transparent border-none px-2 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:ring-0 resize-none max-h-32"
                      style={{ height: 'auto' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={isLoading || (!input.trim() && !fileContent)}
                      className="p-3 bg-white text-forge-dark rounded-[1.25rem] hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100 shadow-xl"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                  <p className="text-[9px] text-center text-stone-600 font-bold uppercase tracking-[0.2em]">Oracle uses Semantic Audit Protocols for Maximum Precision</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
