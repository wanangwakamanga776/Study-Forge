import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Flame, Star, Trophy, Zap, Timer, BrainCircuit, Layers } from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface Quest {
  id: string;
  title: string;
  description: string;
  rewardXP: number;
  rewardEmbers: number;
  iconType: 'timer' | 'brain' | 'layers';
  target: number;
  current: number;
  completed: boolean;
}

export function DailyQuests() {
  const { trackQuestProgress } = useForgeStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [lastReset, setLastReset] = useState<string | null>(localStorage.getItem('forge_quests_reset'));

  const getIcon = (type: Quest['iconType']) => {
    switch (type) {
      case 'timer': return <Timer size={18} />;
      case 'brain': return <BrainCircuit size={18} />;
      case 'layers': return <Layers size={18} />;
      default: return <Circle size={18} />;
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const refreshQuests = () => {
      const saved = localStorage.getItem('forge_quests_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migration: if missing new iconType field, clear and restart
          if (parsed.length > 0 && !parsed[0].iconType) {
            localStorage.removeItem('forge_quests_data');
            setQuests([]);
            return;
          }
          setQuests(parsed);
        } catch (e) {
          localStorage.removeItem('forge_quests_data');
        }
      }
    };

    if (lastReset !== today) {
      // Generate new quests for the day
      const dailyQuests: Quest[] = [
        {
          id: 'focus_session',
          title: 'Deep Work',
          description: 'Focus for 25 minutes',
          rewardXP: 100,
          rewardEmbers: 20,
          iconType: 'timer',
          target: 1,
          current: 0,
          completed: false
        },
        {
          id: 'quiz_master',
          title: 'Brain Probe',
          description: 'Score 100% on any quiz',
          rewardXP: 150,
          rewardEmbers: 30,
          iconType: 'brain',
          target: 1,
          current: 0,
          completed: false
        },
        {
          id: 'card_flip',
          title: 'Memory Lane',
          description: 'Review 10 flashcards',
          rewardXP: 50,
          rewardEmbers: 10,
          iconType: 'layers',
          target: 10,
          current: 0,
          completed: false
        }
      ];
      setQuests(dailyQuests);
      setLastReset(today);
      localStorage.setItem('forge_quests_reset', today);
      localStorage.setItem('forge_quests_data', JSON.stringify(dailyQuests));
    } else {
      refreshQuests();
    }

    window.addEventListener('forge_quests_updated', refreshQuests);
    return () => window.removeEventListener('forge_quests_updated', refreshQuests);
  }, [lastReset]);

  // For Demo purposes, allow clicking to "complete" if in beta/admin
  const isAllCompleted = quests.every(q => q.completed);

  return (
    <section className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-forge-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-forge-accent/10 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Daily Trials</h2>
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Refine your skills. Claim rewards.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
          <Flame size={14} className={cn("text-red-400", isAllCompleted ? "animate-pulse" : "")} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {quests.filter(q => q.completed).length} / {quests.length} Done
          </span>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {quests.map((quest) => (
          <motion.div
            key={quest.id}
            whileHover={!quest.completed ? { x: 4 } : {}}
            className={cn(
              "p-5 rounded-2xl border transition-all relative overflow-hidden",
              quest.completed 
                ? "bg-emerald-500/5 border-emerald-500/20 grayscale-0" 
                : "bg-white/5 border-white/5 hover:border-white/10"
            )}
          >
             {/* Progress bar background */}
             <div 
              className="absolute bottom-0 left-0 h-0.5 bg-forge-accent/30 transition-all duration-1000" 
              style={{ width: `${(quest.current / quest.target) * 100}%` }}
             />

            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg",
                quest.completed ? "bg-emerald-500 text-white" : "bg-stone-800 text-stone-400"
              )}>
                {quest.completed ? <CheckCircle2 size={24} /> : getIcon(quest.iconType)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn(
                    "text-sm font-black uppercase tracking-tight",
                    quest.completed ? "text-emerald-400" : "text-white"
                  )}>
                    {quest.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">{quest.rewardXP} XP</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{quest.description}</p>
              </div>

              {!quest.completed ? (
                <div className="text-right">
                  <p className="text-[10px] font-black text-white">{quest.current}/{quest.target}</p>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-400">
                  <Star size={12} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase">Claimed</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-[8px] font-black text-stone-700 uppercase tracking-[0.3em] text-center">
          Archives refresh in {Math.floor((new Date().setHours(24,0,0,0) - new Date().getTime()) / (1000 * 60 * 60))} Hours
        </p>
      </div>
    </section>
  );
}
