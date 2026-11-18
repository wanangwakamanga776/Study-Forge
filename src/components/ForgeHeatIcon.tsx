import { Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ForgeHeatIconProps {
  streak: number;
  className?: string;
}

export function ForgeHeatIcon({ streak, className }: ForgeHeatIconProps) {
  // Orange = 1-3 days, Red = 4-6 days, Blue = 7+ days
  const getColor = () => {
    if (streak <= 0) return 'text-stone-700';
    if (streak <= 3) return 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]';
    if (streak <= 6) return 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]';
    return 'text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.7)]';
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("flex flex-col items-center gap-1", className)}
    >
      <div className="relative">
        <Flame 
          size={24} 
          className={cn("transition-colors duration-500", getColor())}
          fill="currentColor"
        />
        {streak > 3 && (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn("absolute inset-0 blur-md -z-10", getColor().split(' ').pop())}
          />
        )}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{streak}</span>
    </motion.div>
  );
}
