import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, MessageCircle, Info, Zap, Shield, GraduationCap, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { ForgePersona } from '../types';

export type PyraExpression = 'happy' | 'thinking' | 'excited' | 'tutorial';

interface PyraMascotProps {
  expression?: PyraExpression;
  message?: string;
  className?: string;
  persona?: ForgePersona;
  skinOverride?: string;
}

export function PyraMascot({ expression = 'happy', message, className, persona, skinOverride }: PyraMascotProps) {
  const { activeAssistantSkin } = useForgeStore();
  const currentSkin = skinOverride || activeAssistantSkin;

  const getIcon = () => {
    if (persona === 'forge_master') return <Shield className="text-red-400" size={32} />;
    if (persona === 'vault_scholar') return <GraduationCap className="text-blue-400" size={32} />;
    if (persona === 'spark_mode') return <Terminal className="text-yellow-400" size={32} />;
    
    switch (expression) {
      case 'excited': return <Sparkles className="text-forge-accent" size={32} />;
      case 'thinking': return <Info className="text-blue-400" size={32} />;
      case 'tutorial': return <Flame className="text-forge-accent animate-pulse" size={32} />;
      default: return <Flame className="text-forge-accent" size={32} />;
    }
  };

  const getSkinStyles = () => {
    // Priority 1: Direct Persona Prop
    if (persona) {
      switch (persona) {
        case 'forge_master':
          return {
            body: "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
            glow: "bg-red-500/20",
            eyes: "bg-red-500",
            accents: <div className="absolute top-0 w-full h-4 bg-red-600/40 z-20 flex items-center justify-center font-black text-[6px] text-white tracking-widest uppercase">Master</div>
          };
        case 'vault_scholar':
          return {
            body: "border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]",
            glow: "bg-blue-400/20",
            eyes: "bg-blue-400",
            accents: <div className="absolute inset-0 border border-blue-400/20 rounded-full animate-pulse" />
          };
        case 'ember_coach':
          return {
            body: "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]",
            glow: "bg-orange-500/20",
            eyes: "bg-orange-500",
            accents: <div className="absolute bottom-0 w-full flex justify-center pb-1"><Flame size={12} className="text-orange-400" /></div>
          };
        case 'spark_mode':
          return {
            body: "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]",
            glow: "bg-yellow-400/20",
            eyes: "bg-yellow-400",
            accents: <div className="absolute top-2 w-full flex justify-center animate-bounce"><Zap size={14} className="text-yellow-400 fill-current" /></div>
          };
        default:
          return {
            body: "border-forge-accent/30 shadow-[0_0_20px_rgba(251,146,60,0.2)]",
            glow: "bg-forge-accent/5",
            eyes: "bg-forge-accent",
            accents: null
          };
      }
    }

    // Priority 2: Legacy Assistant Skin
    switch (currentSkin) {
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
      case 'Ghost Protocol':
        return {
          body: "border-stone-500 shadow-[0_0_20px_rgba(120,113,108,0.4)]",
          glow: "bg-stone-500/10",
          eyes: "bg-stone-400",
          accents: <div className="absolute top-0 w-full h-3 bg-stone-800/80 z-20 flex items-center justify-center font-black text-[5px] text-stone-300 tracking-widest uppercase">Classified</div>
        };
      case 'Oracle Prime':
        return {
          body: "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
          glow: "bg-amber-500/20",
          eyes: "bg-amber-400",
          accents: <div className="absolute inset-0 border border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
        };
      case 'Circuit Breaker':
        return {
          body: "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]",
          glow: "bg-cyan-400/20",
          eyes: "bg-cyan-400",
          accents: <div className="absolute inset-0 flex items-center justify-center opacity-30 font-mono text-[8px] tracking-tighter text-cyan-200">ERR_0x001</div>
        };
      case 'The Archivist':
        return {
          body: "border-[#d4a373] shadow-[0_0_20px_rgba(212,163,115,0.4)]",
          glow: "bg-[#d4a373]/10",
          eyes: "bg-[#d4a373]",
          accents: <div className="absolute bottom-1 w-full flex justify-center opacity-40"><GraduationCap size={10} className="text-[#d4a373]" /></div>
        };
      case 'Forge Wraith':
        return {
          body: "border-white shadow-[0_0_30px_rgba(255,255,255,0.6)]",
          glow: "bg-white/10",
          eyes: "bg-white",
          accents: <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent animate-pulse" />
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
          "w-24 h-24 bg-forge-dark border-2 shadow-xl rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-500",
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
               className={cn("w-2.5 h-4 rounded-full transition-colors duration-500", skin.eyes)} 
            />
            <motion.div 
               animate={{ scaleY: [1, 1, 0.1, 1] }} 
               transition={{ duration: 4, repeat: Infinity, times: [0, 0.8, 0.9, 1] }}
               className={cn("w-2.5 h-4 rounded-full transition-colors duration-500", skin.eyes)} 
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
            "absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-12 blur-sm rounded-full -rotate-12 transition-colors duration-500",
            currentSkin === 'Drill Sergeant' ? "bg-red-500/40" : 
            currentSkin === 'Zen Master' ? "bg-emerald-400/40" :
            currentSkin === 'Rival' ? "bg-purple-500/40" : 
            currentSkin === 'Ghost Protocol' ? "bg-stone-500/30" :
            currentSkin === 'Oracle Prime' ? "bg-amber-500/30" :
            currentSkin === 'Circuit Breaker' ? "bg-cyan-400/30" :
            currentSkin === 'The Archivist' ? "bg-[#d4a373]/30" :
            currentSkin === 'Forge Wraith' ? "bg-white/40" : "bg-forge-accent/20"
          )} 
        />
        <motion.div 
          animate={{ rotate: [0, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className={cn(
            "absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-12 blur-sm rounded-full rotate-12 transition-colors duration-500",
            currentSkin === 'Drill Sergeant' ? "bg-red-500/40" : 
            currentSkin === 'Zen Master' ? "bg-emerald-400/40" :
            currentSkin === 'Rival' ? "bg-purple-500/40" : 
            currentSkin === 'Ghost Protocol' ? "bg-stone-500/30" :
            currentSkin === 'Oracle Prime' ? "bg-amber-500/30" :
            currentSkin === 'Circuit Breaker' ? "bg-cyan-400/30" :
            currentSkin === 'The Archivist' ? "bg-[#d4a373]/30" :
            currentSkin === 'Forge Wraith' ? "bg-white/40" : "bg-forge-accent/20"
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
