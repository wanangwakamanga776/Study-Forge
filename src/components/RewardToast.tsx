import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface RewardEvent {
  id: string;
  xp: number;
  embers: number;
  message: string;
}

interface RewardContextType {
  triggerReward: (xp: number, embers: number, message: string) => void;
}

const RewardContext = createContext<RewardContextType | undefined>(undefined);

export function RewardProvider({ children }: { children: React.ReactNode }) {
  const [rewards, setRewards] = useState<RewardEvent[]>([]);

  const triggerReward = useCallback((xp: number, embers: number, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setRewards(prev => [...prev, { id, xp, embers, message }]);
    soundService.playSuccess();
    
    setTimeout(() => {
      setRewards(prev => prev.filter(r => r.id !== id));
    }, 4000);
  }, []);

  return (
    <RewardContext.Provider value={{ triggerReward }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none">
        <AnimatePresence>
          {rewards.map((reward) => (
            <motion.div
              key={reward.id}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.8 }}
              className="bg-forge-dark/90 border border-forge-accent/50 backdrop-blur-xl px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(251,146,60,0.3)] min-w-[280px]"
            >
              <div className="w-10 h-10 rounded-xl bg-forge-accent flex items-center justify-center text-forge-dark">
                <Star size={20} fill="currentColor" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-forge-accent">{reward.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-white font-black text-sm">
                    <span className="text-forge-accent">+</span> {reward.xp} <span className="text-[10px] text-stone-500">XP</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1 text-white font-black text-sm">
                    <Flame size={12} className="text-orange-500" fill="currentColor" />
                    <span className="text-forge-accent">+</span> {reward.embers} <span className="text-[10px] text-stone-500">EMBERS</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </RewardContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardContext);
  if (!context) throw new Error('useRewards must be used within a RewardProvider');
  return context;
}
