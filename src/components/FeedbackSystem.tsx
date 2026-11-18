import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bug, Sparkles, MessageSquare, Laptop, CheckCircle2, ChevronRight, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { submitFeedback } from '../services/dataService';
import { useAuthContext } from '../contexts/AuthContext';

const FEEDBACK_CATEGORIES = [
  { id: 'Bug Report', icon: <Bug size={14} />, color: 'text-red-500' },
  { id: 'Feature Request', icon: <Sparkles size={14} />, color: 'text-forge-accent' },
  { id: 'UI Suggestion', icon: <Laptop size={14} />, color: 'text-blue-500' },
  { id: 'Performance Issue', icon: <Zap size={14} />, color: 'text-yellow-500' },
  { id: 'General Feedback', icon: <MessageSquare size={14} />, color: 'text-emerald-500' },
];

export const FeedbackSection: React.FC = () => {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[4].id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    soundService.playClick();

    try {
      await submitFeedback({
        userId: user?.uid || 'guest',
        username: user?.displayName || 'Guest User',
        title,
        message,
        category: category as any,
        status: 'pending',
        createdAt: Date.now()
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
    } catch (error) {
      console.error('Feedback submission error:', error);
      try {
        const errorInfo = JSON.parse(error instanceof Error ? error.message : String(error));
        console.error('Firestore Error Details:', errorInfo);
      } catch (e) {
        console.error('Could not parse error JSON');
      }
      soundService.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full">
      <div className="flex flex-col items-center justify-center text-center space-y-6 mb-12">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20">
          <MessageSquare size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Feedback</h2>
          <p className="text-white/50 text-xs font-bold uppercase tracking-[0.3em] mt-3">Help improve Study Forge</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          onClick={() => !isOpen && setIsOpen(true)}
          className={cn(
            "p-8 md:p-12 glass-panel rounded-[3rem] border border-white/5 cinematic-shadow relative overflow-hidden transition-all duration-500",
            !isOpen ? "cursor-pointer hover:border-forge-accent/30 group" : "bg-white/[0.03]"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-forge-accent/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div 
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-8">
                   <div className="hidden md:flex -space-x-4">
                      {FEEDBACK_CATEGORIES.map((cat, i) => (
                        <div key={i} className={cn("w-12 h-12 rounded-full border-4 border-forge-dark bg-white/5 flex items-center justify-center", cat.color)}>
                          {cat.icon}
                        </div>
                      ))}
                   </div>
                   <div>
                      <p className="text-xl font-display font-black text-white italic truncate">Open a communication channel with the Archivist.</p>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">Initiating feedback protocol v1.0</p>
                   </div>
                </div>
                <div className="w-12 h-12 bg-forge-accent text-forge-dark rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight size={24} />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="open"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 text-forge-accent rounded-xl">
                        <Send size={20} />
                      </div>
                      <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Send Feedback</h3>
                   </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    className="p-2 text-white/20 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4">Title</label>
                         <input 
                            required
                            type="text"
                            placeholder="Briefly identify the report..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-forge-accent/50 transition-all placeholder:text-white/10"
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4">Type</label>
                         <div className="flex flex-wrap gap-2">
                            {FEEDBACK_CATEGORIES.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategory(cat.id)}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                  category === cat.id 
                                    ? "bg-forge-accent text-forge-dark border-forge-accent" 
                                    : "bg-white/5 text-white/30 border-white/5 hover:border-white/10"
                                )}
                              >
                                {cat.id}
                              </button>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4">Your Message</label>
                      <textarea 
                         required
                         placeholder="Describe the desired expansion or identified anomaly..."
                         value={message}
                         onChange={(e) => setMessage(e.target.value)}
                         className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-3xl text-white font-medium outline-none focus:border-forge-accent/50 transition-all placeholder:text-white/10 resize-none h-24 md:h-32"
                      />
                   </div>

                   <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-3">
                        <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest italic">User Identifier: {user?.uid ? `${user.uid.slice(0, 8)}...` : 'SYNERGY-GUEST'}</p>
                      </div>
                      <button
                        disabled={isSubmitting || isSuccess}
                        type="submit"
                        className={cn(
                          "px-6 py-3 md:px-12 md:py-4 rounded-2xl font-display font-black uppercase italic tracking-tighter transition-all flex items-center gap-3",
                          isSuccess 
                            ? "bg-emerald-500 text-white" 
                            : "bg-white text-forge-dark hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                        )}
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-forge-dark/30 border-t-forge-dark rounded-full animate-spin" />
                        ) : isSuccess ? (
                          <>
                            <CheckCircle2 size={18} />
                            Sent successfully
                          </>
                        ) : (
                          <>
                            Synthesize & Send
                            <ChevronRight size={18} />
                          </>
                        )}
                      </button>
                   </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
