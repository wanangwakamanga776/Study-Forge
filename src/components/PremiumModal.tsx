import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Star, ShieldCheck } from 'lucide-react';
import { PREMIUM_PRICES } from '../constants';
import { cn } from '../lib/utils';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'Premium') => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-card rounded-[2.5rem] overflow-hidden"
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 sm:p-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-forge-accent/10 text-forge-accent rounded-2xl forge-glow">
                  <Star size={28} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Study Pro</h2>
              </div>

              <p className="text-stone-400 mb-10 font-bold text-sm">
                Unlock the full power of Study Forge. Build unlimited knowledge and master your learning.
              </p>

              <div className="space-y-5 mb-12">
                <FeatureItem text="Unlimited AI Quiz Generation" />
                <FeatureItem text="Unlimited Flashcard Generation" />
                <FeatureItem text="Advanced Mastery Analytics" />
                <FeatureItem text="Exclusive Academic Themes" />
                <FeatureItem text="Priority AI Processing" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button
                  onClick={() => onUpgrade('Premium')}
                  className="group relative flex flex-col items-center p-8 bg-white/5 border border-white/10 text-white rounded-[2rem] hover:bg-white/10 transition-all"
                >
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Monthly</span>
                  <span className="text-3xl font-extrabold font-display italic tracking-tighter">${PREMIUM_PRICES.monthly}</span>
                  <span className="text-[10px] text-stone-600 mt-2 font-bold uppercase tracking-widest">Standard Access</span>
                </button>

                <button
                  onClick={() => onUpgrade('Premium')}
                  className="group relative flex flex-col items-center p-8 forge-gradient text-forge-dark rounded-[2rem] hover:scale-105 transition-all forge-glow"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-forge-dark text-[10px] font-black rounded-full shadow-lg uppercase italic tracking-tighter">
                    Best Value
                  </div>
                  <span className="text-[10px] font-bold text-forge-dark/60 uppercase tracking-widest mb-2">Yearly</span>
                  <span className="text-3xl font-extrabold font-display italic tracking-tighter">${PREMIUM_PRICES.yearly}</span>
                  <span className="text-[10px] text-forge-dark/60 mt-2 font-bold uppercase tracking-widest">Save over 40%</span>
                </button>
              </div>

              <p className="text-center text-[10px] text-stone-600 mt-10 font-bold uppercase tracking-widest">
                Cancel anytime. Learning never stops.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
      <Check size={12} strokeWidth={3} />
    </div>
    <span className="text-sm font-medium text-stone-700">{text}</span>
  </div>
);
