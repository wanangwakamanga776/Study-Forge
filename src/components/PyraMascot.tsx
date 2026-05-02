import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, MessageCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type PyraExpression = 'happy' | 'thinking' | 'excited' | 'tutorial';

interface PyraMascotProps {
  expression?: PyraExpression;
  message?: string;
  className?: string;
}

export function PyraMascot({ expression = 'happy', message, className }: PyraMascotProps) {
  const getIcon = () => {
    switch (expression) {
      case 'excited': return <Sparkles className="text-forge-accent" size={24} />;
      case 'thinking': return <Info className="text-blue-400" size={24} />;
      case 'tutorial': return <Flame className="text-forge-accent animate-pulse" size={24} />;
      default: return <Flame className="text-forge-accent" size={24} />;
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Mascot Body */}
        <div className="w-20 h-20 bg-forge-dark border-2 border-forge-accent/30 rounded-full flex items-center justify-center relative shadow-[0_0_20px_rgba(251,146,60,0.2)] overflow-hidden">
          {/* Internal Glow */}
          <div className="absolute inset-0 bg-forge-accent/5" />
          
          {/* Eyes */}
          <div className="flex gap-4 mb-2 relative z-10">
            <motion.div 
               animate={{ scaleY: [1, 1, 0.1, 1] }} 
               transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.9, 1] }}
               className="w-2 h-3 bg-forge-accent rounded-full" 
            />
            <motion.div 
               animate={{ scaleY: [1, 1, 0.1, 1] }} 
               transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.9, 1] }}
               className="w-2 h-3 bg-forge-accent rounded-full" 
            />
          </div>

          {/* Expression Icon (Mouth area) */}
          <div className="absolute bottom-4 relative z-10">
            {getIcon()}
          </div>
        </div>

        {/* Small Flame Wings */}
        <motion.div 
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-10 bg-forge-accent/20 blur-sm rounded-full -rotate-12" 
        />
        <motion.div 
          animate={{ rotate: [0, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-10 bg-forge-accent/20 blur-sm rounded-full rotate-12" 
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
