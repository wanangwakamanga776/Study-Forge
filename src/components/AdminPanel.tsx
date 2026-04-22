import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Terminal, X, Zap, Star, Flame, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateCheat: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onActivateCheat }) => {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  // Final confirmation to prevent accidental cheat
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // The "password" for the code panel mentioned by user
    if (passcode === 'StudyForgeAdmin') {
      setIsUnlocked(true);
      setError(false);
      soundService.playSuccess();
    } else {
      setError(true);
      soundService.playError();
      setTimeout(() => setError(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-forge-dark border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-accent via-red-500 to-forge-accent animate-pulse" />
        
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-forge-accent/20 text-forge-accent rounded-lg">
                    <Shield size={20} />
                </div>
                <h2 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Security Override</h2>
            </div>
            <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 ml-1">Access Protocol</label>
              <div className="relative group">
                <Lock className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                  error ? "text-red-500" : "text-stone-600 group-focus-within:text-forge-accent"
                )} size={18} />
                <input
                  autoFocus
                  type="password"
                  placeholder="Enter Root Passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className={cn(
                    "w-full h-14 bg-white/[0.03] border rounded-2xl pl-12 pr-4 text-white font-bold outline-none transition-all",
                    error ? "border-red-500 ring-4 ring-red-500/10" : "border-white/5 focus:border-forge-accent focus:ring-4 focus:ring-forge-accent/10"
                  )}
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full py-4 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Verify Identity
            </button>
          </form>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-2">
                 <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Terminal size={24} />
                 </div>
                 <h3 className="text-emerald-500 font-black uppercase italic tracking-tighter text-lg">System Access Granted</h3>
                 <p className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">Master Authority Level Active</p>
             </div>

             <div className="space-y-3">
                 <button
                    onClick={() => {
                        onActivateCheat();
                        soundService.playLevelUp();
                    }}
                    className="w-full p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/5 hover:border-forge-accent/50 transition-all group group/btn"
                 >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-forge-accent/10 text-forge-accent rounded-2xl group-hover/btn:scale-110 transition-transform">
                            <Zap size={24} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-white uppercase italic tracking-tighter">Forge Transcendence</p>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Max Level + Unlimited Embers</p>
                        </div>
                        <div className="ml-auto opacity-0 group-hover/btn:opacity-100 transition-opacity">
                            <Check className="text-emerald-500" size={20} />
                        </div>
                    </div>
                 </button>

                 <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                     <div className="flex items-center gap-3 text-[9px] font-bold text-stone-600 uppercase tracking-widest">
                         <div className="w-1.5 h-1.5 bg-forge-accent rounded-full animate-ping" />
                         Real-time Metrics Tracking: Enabled
                     </div>
                 </div>
             </div>
             
             <p className="text-center text-[8px] text-stone-700 font-bold uppercase tracking-[0.3em]">
                 Unauthorized access to academy archives is logged.
             </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
