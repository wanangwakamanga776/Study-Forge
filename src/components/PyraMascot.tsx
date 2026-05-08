import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, MessageCircle, Info, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useForgeStore } from '../contexts/ForgeStoreContext';

export type PyraExpression = 'happy' | 'thinking' | 'excited' | 'tutorial';

interface PyraMascotProps {
  expression?: PyraExpression;
  message?: string;
  className?: string;
}

export function PyraMascot({ expression = 'happy', message, className }: PyraMascotProps) {
  const { activeAssistantSkin } = useForgeStore();

  const getIcon = () => {
    switch (expression) {
      case 'excited': return <Sparkles className="text-forge-accent" size={24} />;
      case 'thinking': return <Info className="text-blue-400" size={24} />;
      case 'tutorial': return <Flame className="text-forge-accent animate-pulse" size={24} />;
      default: return <Flame className="text-forge-accent" size={24} />;
    }
  };

  const getSkinStyles = () => {
    switch (activeAssistantSkin) {
      case 'Drill Sergeant':
        return {
          body: "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
          glow: "bg-red-500/20",
          eyes: "bg-red-500",
          accents: <div className="absolute top-0 w-full h-4 bg-red-600/40 z-20 flex items-center justify-center font-black text-[6px] text-white tracking-widest">ELITE</div>
        };
      case 'Zen Master':
        return {
          body: "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]",
          glow: "bg-emerald-400/20",
          eyes: "bg-emerald-400",
          accents: <div className="absolute inset-0 border border-emerald-400/20 rounded-full animate-ping" />
        };
      case 'Rival':
        return {
          body: "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
          glow: "bg-purple-500/20",
          eyes: "bg-purple-500",
          accents: <div className="absolute -top-2 w-full flex justify-center"><Zap size={16} className="text-purple-400 fill-current" /></div>
        };
      default:
        return {
          body: "border-forge-accent/30 shadow-[0_0_20px_rgba(251,146,60,0.2)]",
          glow: "bg-forge-accent/5",
          eyes: "bg-forge-accent",
          accents: null
        };
    }
  };

  const skin = getSkinStyles();

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Mascot Body */}
        <div className={cn(
          "w-20 h-20 bg-forge-dark border-2 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-500",
          skin.body
        )}>
          {/* Internal Glow */}
          <div className={cn("absolute inset-0 transition-colors duration-500", skin.glow)} />
          
          {/* Skin Accents */}
          {skin.accents}
          
          {/* Eyes */}
          <div className="flex gap-4 mb-2 relative z-10">
            <motion.div 
               animate={{ scaleY: [1, 1, 0.1, 1] }} 
               transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.9, 1] }}
               className={cn("w-2 h-3 rounded-full transition-colors duration-500", skin.eyes)} 
            />
            <motion.div 
               animate={{ scaleY: [1, 1, 0.1, 1] }} 
               transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.9, 1] }}
               className={cn("w-2 h-3 rounded-full transition-colors duration-500", skin.eyes)} 
            />
          </div>

          {/* Expression Icon (Mouth area) */}
          <div className="absolute bottom-4 relative z-10">
            {getIcon()}
          </div>
        </div>

        {/* Small Flame Wings */}
        <motion.div 
          animate={{ rotate: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className={cn(
            "absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-10 blur-sm rounded-full -rotate-12 transition-colors duration-500",
            activeAssistantSkin === 'Drill Sergeant' ? "bg-red-500/40" : 
            activeAssistantSkin === 'Zen Master' ? "bg-emerald-400/40" :
            activeAssistantSkin === 'Rival' ? "bg-purple-500/40" : "bg-forge-accent/20"
          )} 
        />
        <motion.div 
          animate={{ rotate: [0, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className={cn(
            "absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-10 blur-sm rounded-full rotate-12 transition-colors duration-500",
            activeAssistantSkin === 'Drill Sergeant' ? "bg-red-500/40" : 
            activeAssistantSkin === 'Zen Master' ? "bg-emerald-400/40" :
            activeAssistantSkin === 'Rival' ? "bg-purple-500/40" : "bg-forge-accent/20"
          )} 
        />
      </motion.div>

      {message && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative"
          >
            {/* Speech Bubble */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 max-w-[200px] shadow-xl">
               <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-relaxed text-center italic">
                 {message}
               </p>
            </div>
            {/* Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/5 border-l border-t border-white/10 rotate-45" />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
