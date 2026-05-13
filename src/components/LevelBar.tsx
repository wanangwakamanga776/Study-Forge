import { motion } from 'motion/react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { Star } from 'lucide-react';

export function LevelBar() {
  const { xp, level } = useForgeStore();
  
  const currentThreshold = (level - 1) * 1000;
  const nextXp = level * 1000;
  const currentLevelXp = xp - currentThreshold;
  const neededXp = 1000;
  const progress = Math.min(100, Math.max(0, (currentLevelXp / neededXp) * 100));

  return (
    <div className="w-full max-w-xl mx-auto min-h-[80px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-forge-accent text-forge-dark flex items-center justify-center font-black animate-pulse shadow-[0_0_15px_rgba(var(--forge-accent-rgb),0.4)]">
            {level}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Academic Level</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent">{xp} XP</span>
          <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Next Milestone: {nextXp}</p>
        </div>
      </div>
      
      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 relative p-[2px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-orange-600 via-forge-accent to-yellow-400 rounded-full relative"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-0 right-0 bottom-0 w-8 bg-white/30 blur-sm"
          />
        </motion.div>
      </div>

      <div className="flex justify-between mt-1 px-1">
        <span className="text-[8px] font-mono text-stone-600">{currentThreshold}</span>
        <div className="flex items-center gap-1">
            <Star size={8} className="text-forge-accent fill-current" />
            <span className="text-[8px] font-mono text-stone-600">{Math.round(currentLevelXp)} / {neededXp}</span>
        </div>
        <span className="text-[8px] font-mono text-stone-600">{nextXp}</span>
      </div>
    </div>
  );
}
