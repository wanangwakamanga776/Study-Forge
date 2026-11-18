import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  Split, 
  Waves, 
  Ghost, 
  Search, 
  Crosshair, 
  Sparkles,
  X,
  ChevronRight,
  BrainCircuit,
  Zap,
  ShieldAlert,
  Dna,
  Infinity,
  ZapOff
} from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';

interface PowerUp {
  id: string;
  name: string;
  price: number;
  desc: string;
  icon: React.ReactNode;
  tier: 'tactical' | 'strategic' | 'god_mode';
}

const POWER_UPS: PowerUp[] = [
  { id: 'neural_nudge', name: 'Brain Boost', price: 5, desc: 'A helpful push in the right direction. Hints and clues.', icon: <Lightbulb size={18} />, tier: 'tactical' },
  { id: 'temporal_splice', name: 'Smart Fix', price: 8, desc: 'Analyzes your mistakes and explains exactly HOW to improve.', icon: <Split size={18} />, tier: 'tactical' },
  { id: 'echo_chamber', name: 'Memory Hooks', price: 10, desc: 'Catchy mnemonics, stories, and tricks to remember.', icon: <Waves size={18} />, tier: 'strategic' },
  { id: 'phantom_recall', name: 'Error Scan', price: 15, desc: 'Deep analysis of patterns in your repeated mistakes.', icon: <Ghost size={18} />, tier: 'strategic' },
  { id: 'deep_dive', name: 'Step-by-Step Explainer', price: 15, desc: 'Breaks difficult concepts into simple, easy steps.', icon: <Search size={18} />, tier: 'strategic' },
  { id: 'kill_chain', name: 'Mastery Plan', price: 25, desc: 'A personalized 5-step roadmap to master this topic.', icon: <Crosshair size={18} />, tier: 'god_mode' },
];

interface PowerUpPanelProps {
  context?: {
    card_front?: string;
    card_back?: string;
    their_wrong_answer?: string;
    topic?: string;
    topic_tag?: string;
  };
  suggestedId?: string;
}

export function PowerUpPanel({ context, suggestedId }: PowerUpPanelProps) {
  const { embers, purchaseEmberItem, stats } = useForgeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleActivate = async (powerUp: PowerUp) => {
    if (embers < powerUp.price || isGenerating) {
        soundService.playError();
        return;
    }

    setIsGenerating(true);
    soundService.playProcess();
    
    try {
      const rewardData = await purchaseEmberItem(powerUp.id, context);
      setReward(rewardData);
      setIsOpen(false);
      soundService.playSuccess();
    } catch (error: any) {
      console.error('Power-Up Activation Error:', error);
      // We could show a toast here
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestedPowerUp = suggestedId ? POWER_UPS.find(p => p.id === suggestedId) : POWER_UPS[0];

  return (
    <>
      {/* Tactical Hub Trigger */}
      <div className="flex flex-col items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
              setIsOpen(true);
              soundService.playClick();
          }}
          className="relative group bg-stone-900/80 hover:bg-stone-800 border border-white/10 backdrop-blur-xl px-5 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <div className="relative">
            <Zap size={18} className="text-forge-accent group-hover:scale-125 transition-transform" />
            <div className="absolute inset-0 bg-forge-accent/20 blur-lg rounded-full" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest leading-none mb-1">Study Tools</span>
            <span className="text-xs font-bold text-white tracking-widest uppercase italic">The Help Shop</span>
          </div>
          
          <div className="ml-2 px-2 py-1 bg-forge-accent/10 rounded-lg border border-forge-accent/20">
             <span className="text-[10px] font-black text-forge-accent">{embers}</span>
          </div>
        </motion.button>
      </div>

      {/* Arsenal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-stone-950/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl bg-stone-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-forge-accent/10 border border-forge-accent/30 rounded-2xl flex items-center justify-center forge-glow">
                    <BrainCircuit size={28} className="text-forge-accent" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Study Arsenal</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                            <ShieldAlert size={10} className="text-stone-500" />
                            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">Cognitive Load: Nominal</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-forge-accent/10 rounded-md border border-forge-accent/10">
                            <Infinity size={10} className="text-forge-accent" />
                            <span className="text-[9px] font-bold text-forge-accent uppercase tracking-widest">Ember Stability: High</span>
                        </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-3 text-stone-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {POWER_UPS.map((pu) => (
                  <button
                    key={pu.id}
                    disabled={embers < pu.price || isGenerating}
                    onClick={() => handleActivate(pu)}
                    className={cn(
                        "group relative flex flex-col items-start p-6 rounded-3xl border transition-all text-left overflow-hidden",
                        pu.id === suggestedId 
                          ? "bg-forge-accent/10 border-forge-accent/40" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/20",
                        embers < pu.price && "opacity-40 grayscale pointer-events-none"
                    )}
                  >
                    <div className="w-full flex items-center justify-between mb-4">
                        <div className={cn(
                            "p-3 rounded-xl",
                            pu.id === suggestedId ? "bg-forge-accent text-stone-900 shadow-[0_0_20px_rgba(var(--forge-accent-rgb),0.4)]" : "bg-white/5 text-forge-accent"
                        )}>
                          {pu.icon}
                        </div>
                        <div className="flex items-center gap-1.5 font-black text-white text-sm">
                           <Sparkles size={14} className="text-yellow-400" />
                           {pu.price}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-black text-white uppercase tracking-tight mb-1">{pu.name}</span>
                        <p className="text-[10px] text-stone-500 font-medium leading-relaxed mb-4">{pu.desc}</p>
                    </div>

                    <div className={cn(
                        "mt-auto px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em]",
                        pu.tier === 'tactical' ? "bg-blue-500/10 text-blue-400" :
                        pu.tier === 'strategic' ? "bg-purple-500/10 text-purple-400" :
                        "bg-forge-accent/20 text-forge-accent"
                    )}>
                        {pu.tier.replace('_', ' ')} Logic
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-center gap-8">
                 <div className="flex items-center gap-2">
                    <Dna size={14} className="text-stone-700" />
                    <span className="text-[9px] font-bold text-stone-700 uppercase tracking-widest">Procedural Generation Active</span>
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
                 <div className="flex items-center gap-2">
                    <ZapOff size={14} className="text-stone-700" />
                    <span className="text-[9px] font-bold text-stone-700 uppercase tracking-widest">No Hidden Fees</span>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Intelligence Delivery Layer */}
        {reward && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-950/95 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-3xl bg-stone-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              {/* Rewards Header */}
              <div className="p-10 pb-0 text-center relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-forge-accent rounded-b-full shadow-[0_0_20px_rgba(var(--forge-accent-rgb),0.5)]" />
                 
                 <div className="w-24 h-24 bg-forge-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-forge-accent/30 shadow-[0_0_60px_rgba(var(--forge-accent-rgb),0.2)]">
                   <Sparkles size={48} className="text-forge-accent animate-pulse" />
                 </div>
                 
                 <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
                   {reward.reward_delivered.item_name} Online
                 </h2>
                 
                 <div className="flex justify-center gap-3">
                    <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-stone-400 uppercase tracking-widest">
                       Persona: {reward.reward_delivered.assistant_persona}
                    </div>
                    <div className="px-5 py-2 bg-forge-accent/10 border border-forge-accent/20 rounded-2xl text-[10px] font-black text-forge-accent uppercase tracking-widest">
                       Effect: Cognitive Bias Correction
                    </div>
                 </div>
              </div>

              {/* Reward Content Area */}
              <div className="p-10 pt-8">
                <div className="bg-stone-950/40 border border-white/5 rounded-[2rem] p-10 shadow-inner overflow-y-auto max-h-[45vh] metallic-scrollbar">
                  <div className="prose prose-invert max-w-none">
                     <div className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4 italic tracking-tight">
                        Intel Report: {reward.reward_content.title || 'Mastery Breakdown'}
                     </div>
                     <pre className="whitespace-pre-wrap font-sans text-lg text-stone-300 leading-relaxed italic border-l-4 border-forge-accent pl-8 bg-transparent">
                       {reward.reward_content.content}
                     </pre>
                  </div>
                </div>
                
                {reward.reward_content.follow_up_action && (
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 bg-forge-accent/5 border border-forge-accent/20 rounded-2xl p-6 flex items-center gap-6"
                  >
                    <div className="w-12 h-12 bg-forge-accent text-stone-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <ChevronRight size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-forge-accent uppercase tracking-widest mb-1">Operational Directive</p>
                      <p className="text-base font-bold text-white italic tracking-tight">{reward.reward_content.follow_up_action}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="p-10 pt-0 flex justify-center pb-12">
                <button
                  onClick={() => setReward(null)}
                  className="group relative px-16 py-5 bg-white text-stone-950 rounded-2xl font-black uppercase tracking-[0.2em] italic hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  <span className="relative z-10">Resume Operation</span>
                  <div className="absolute inset-0 bg-forge-accent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                </button>
              </div>

              <div className="absolute top-8 right-8">
                <button onClick={() => setReward(null)} className="p-2 text-stone-600 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
