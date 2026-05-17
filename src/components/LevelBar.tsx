import { useState } from 'react';
import { motion } from 'motion/react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { Star } from 'lucide-react';
import { ProgressModal } from './ProgressModal';

export function LevelBar() {
  const { xp, level } = useForgeStore();
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  
  const currentThreshold = (level - 1) * 1000;
  const nextXp = level * 1000;
  const currentLevelXp = xp - currentThreshold;
  const neededXp = 1000;
  const progress = Math.min(100, Math.max(0, (currentLevelXp / neededXp) * 100));

  return (
    <div className="w-full max-w-xl mx-auto min-h-[80px]">
      <ProgressModal isOpen={isProgressOpen} onClose={() => setIsProgressOpen(false)} />
      <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setIsProgressOpen(true)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forge-accent to-orange-600 text-white flex items-center justify-center font-black shadow-[0_0_20px_rgba(251,146,60,0.5)]">
            {level}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Study Level</span>
            <span className="text-xs font-bold text-white uppercase tracking-widest leading-none mt-1">Level {level}</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-forge-accent font-black">{xp}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent/70">XP</span>
          </div>
          <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest mt-1">Next Level: {nextXp}</p>
        </div>
      </div>
      
      <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 relative p-[2px] shadow-inner" onClick={() => setIsProgressOpen(true)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-orange-600 via-forge-accent to-yellow-400 rounded-full relative shadow-[0_0_15px_rgba(251,146,60,0.8)] flex items-center justify-end px-2"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[slide_1s_linear_infinite]" />
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 bg-white rounded-full relative z-10 shadow-[0_0_10px_white]"
          />
        </motion.div>
      </div>

      <div className="flex justify-between mt-2 px-1">
        <span className="text-[9px] font-bold tracking-widest text-stone-500 uppercase">{currentThreshold}</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
            <Star size={10} className="text-forge-accent fill-current animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-stone-400 uppercase">{Math.round(currentLevelXp)} / {neededXp}</span>
        </div>
        <span className="text-[9px] font-bold tracking-widest text-stone-500 uppercase">{nextXp}</span>
      </div>
    </div>
  );
}
