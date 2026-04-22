import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Paperclip, Loader2, User, BookOpen, FileText, Trash2, Zap, Layers, BrainCircuit } from 'lucide-react';
import { chatWithAcademicAssistant, isAIConfigured } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ForgeChatProps {
  onNavigate?: (view: any) => void;
  onOpenForge?: (topic?: string) => void;
  onSaveData?: (type: 'flashcards' | 'quiz' | 'forgeCast', data: any) => void;
}

export function ForgeChat({ onNavigate, onOpenForge, onSaveData }: ForgeChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Academic Assistant active. I am here to help you master your curriculum. What topic should we explore today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() && !fileContent) return;
    if (!isAIConfigured) {
      alert("AI Configuration needed. Please set your API Key in the settings to activate the Academic Assistant.");
      return;
    }

    const userMessage = input.trim() || (fileContent ? `I've uploaded a file: ${fileName}. Please analyze it.` : '');
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

      const response = await chatWithAcademicAssistant(userMessage, history, fileContent || undefined);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
       setMessages(prev => [...prev, { role: 'model', content: "I apologize, but I encountered an error processing your request. " + (error as Error).message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      soundService.playSuccess();
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          soundService.playClick();
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-forge-accent text-forge-dark rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:scale-110 transition-transform z-50 group"
      >
        <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
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
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-forge-accent/10 rounded-xl flex items-center justify-center text-forge-accent shadow-[0_0_15px_rgba(251,146,60,0.2)]">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Academic Assistant</h3>
                      <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Available for Lessons</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setMessages([{ role: 'model', content: "Session reset. How can I assist you with a new topic?" }]);
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

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 metallic-scrollbar">
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
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === 'user' 
                        ? "bg-white/5 text-white rounded-tr-none" 
                        : "bg-white/[0.02] text-stone-300 border border-white/5 rounded-tl-none pr-8 relative"
                    )}>
                      <div className="prose prose-invert prose-sm overflow-x-auto">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {message.content.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\[\[DATA:.*?\]\]/g, '')}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Data & Action Triggers */}
                      {message.role === 'model' && (
                        <div className="mt-4 flex flex-col gap-4">
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
                                            id: crypto.randomUUID(),
                                            ...data,
                                            cards: (data.cards || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
                                            createdAt: Date.now()
                                          });
                                        } else if (type === 'QUIZ') {
                                          onSaveData?.('quiz', {
                                            id: crypto.randomUUID(),
                                            ...data,
                                            questions: (data.questions || []).map((q: any) => ({ ...q, id: crypto.randomUUID() })),
                                            createdAt: Date.now()
                                          });
                                        }
                                      }}
                                      className="w-full py-2 bg-forge-accent text-forge-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
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
                      <BookOpen size={16} />
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-forge-accent" />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Generating response...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
                {fileContent && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-forge-accent/20"
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
                
                <div className="relative flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md,.pdf"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-white/5 text-stone-400 rounded-xl hover:text-white hover:bg-white/10 transition-all border border-white/5"
                  >
                    <Paperclip size={20} />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask the Assistant..."
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-forge-accent/30 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !fileContent)}
                    className="p-3 bg-forge-accent text-forge-dark rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 forge-glow"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
