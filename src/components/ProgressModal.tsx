import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, BarChart2 } from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({ isOpen, onClose }) => {
  const { xp, level, embers } = useForgeStore();
  
  // Basic rank calculation
  const getRank = (level: number) => {
    if (level < 5) return 'Novice';
    if (level < 10) return 'Learner';
    if (level < 20) return 'Scholar';
    return 'Master';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-forge-dark border border-white/10 rounded-[2rem] p-8 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-white uppercase italic mb-6">Your Progress</h3>
            
            <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4">
                    <Award className="text-forge-accent" size={32} />
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Rank</p>
                        <p className="text-lg font-bold text-white">{getRank(level)}</p>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4">
                    <BarChart2 className="text-forge-accent" size={32} />
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Experience</p>
                        <p className="text-lg font-bold text-white">{xp} XP</p>
                    </div>
                </div>
                
                <div className="text-center pt-2">
                    <p className="text-sm font-medium text-white/60">Level {level}</p>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
