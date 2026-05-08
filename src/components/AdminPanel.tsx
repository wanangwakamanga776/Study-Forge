import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Terminal, X, Zap, Star, Flame, Check, Edit3, MessageSquare, Image as ImageIcon, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { subscribeAboutMe, updateAboutMe, AboutMeData } from '../services/dataService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSetMaxLevel: (active: boolean) => void;
  onSetUnlimitedCurrency: (active: boolean) => void;
  currentXp: number;
  currentEmbers: number;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, 
  onClose, 
  onSetMaxLevel, 
  onSetUnlimitedCurrency,
  currentXp,
  currentEmbers
}) => {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'cheats' | 'aboutme'>('cheats');

  const isMaxLevel = currentXp >= 1000000;
  const isUnlimitedEmbers = currentEmbers >= 1000000;

  // About Me State
  const [aboutMeMessage, setAboutMeMessage] = useState('');
  const [aboutMeImages, setAboutMeImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load About Me when unlocked
  useEffect(() => {
    if (isUnlocked) {
      const unsubscribe = subscribeAboutMe((data) => {
        if (data && !isSaving) {
          setAboutMeMessage(data.message);
          setAboutMeImages(data.images);
        }
      });
      return () => unsubscribe();
    }
  }, [isUnlocked, isSaving]);

  const handleSaveAboutMe = async () => {
    setIsSaving(true);
    soundService.playClick();
    try {
      await updateAboutMe({
        message: aboutMeMessage,
        images: aboutMeImages
      });
      soundService.playSuccess();
    } catch (e) {
      soundService.playError();
    } finally {
      setIsSaving(false);
    }
  };

  const addImageUrl = () => {
    const url = prompt('Enter Image URL:');
    if (url) setAboutMeImages([...aboutMeImages, url]);
  };

  const removeImage = (idx: number) => {
    setAboutMeImages(aboutMeImages.filter((_, i) => i !== idx));
  };

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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex bg-white/[0.03] p-1 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setActiveTab('cheats')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'cheats' ? "bg-white/10 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
                  )}
                >
                  <Terminal size={14} />
                  Overrides
                </button>
                <button 
                  onClick={() => setActiveTab('aboutme')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'aboutme' ? "bg-white/10 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
                  )}
                >
                  <Edit3 size={14} />
                  About Me
                </button>
             </div>

             {activeTab === 'cheats' ? (
              <div className="space-y-4">
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-2 mb-4">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Terminal size={24} />
                      </div>
                      <h3 className="text-emerald-500 font-black uppercase italic tracking-tighter text-lg">System Access Granted</h3>
                      <p className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest">Master Authority Level Active</p>
                  </div>
                  {/* Max Level Switch */}
                  <button
                    onClick={() => onSetMaxLevel(!isMaxLevel)}
                    className={cn(
                        "w-full p-5 rounded-[2rem] border transition-all flex items-center gap-4",
                        isMaxLevel 
                            ? "bg-forge-accent text-forge-dark border-white/10" 
                            : "bg-white/[0.03] border-white/5 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                        "p-3 rounded-2xl",
                        isMaxLevel ? "bg-forge-dark/20" : "bg-forge-accent/10 text-forge-accent"
                    )}>
                        <Zap size={22} />
                    </div>
                    <div className="text-left flex-1">
                        <p className={cn("text-xs font-black uppercase italic tracking-tighter", isMaxLevel ? "text-forge-dark" : "text-white")}>
                            Forge Transcendence
                        </p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isMaxLevel ? "text-forge-dark/60" : "text-stone-500")}>
                            Max Level Protocol
                        </p>
                    </div>
                    <div className={cn(
                        "w-10 h-6 rounded-full relative transition-colors duration-300",
                        isMaxLevel ? "bg-forge-dark/40" : "bg-white/10"
                    )}>
                        <motion.div 
                            animate={{ x: isMaxLevel ? 18 : 2 }}
                            className={cn(
                                "absolute top-1 left-1 w-4 h-4 rounded-full",
                                isMaxLevel ? "bg-forge-dark" : "bg-stone-600"
                            )}
                        />
                    </div>
                  </button>

                  <button
                    onClick={() => onSetUnlimitedCurrency(!isUnlimitedEmbers)}
                    className={cn(
                        "w-full p-5 rounded-[2rem] border transition-all flex items-center gap-4",
                        isUnlimitedEmbers 
                            ? "bg-orange-500 text-white border-white/10" 
                            : "bg-white/[0.03] border-white/5 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                        "p-3 rounded-2xl",
                        isUnlimitedEmbers ? "bg-white/20 text-white" : "bg-orange-500/10 text-orange-500"
                    )}>
                        <Flame size={22} />
                    </div>
                    <div className="text-left flex-1">
                        <p className={cn("text-xs font-black uppercase italic tracking-tighter", isUnlimitedEmbers ? "text-white" : "text-white")}>
                            Ember Infusion
                        </p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isUnlimitedEmbers ? "text-white/60" : "text-stone-500")}>
                            Unlimited Currency
                        </p>
                    </div>
                    <div className={cn(
                        "w-10 h-6 rounded-full relative transition-colors duration-300",
                        isUnlimitedEmbers ? "bg-white/30" : "bg-white/10"
                    )}>
                        <motion.div 
                            animate={{ x: isUnlimitedEmbers ? 18 : 2 }}
                            className={cn(
                                "absolute top-1 left-1 w-4 h-4 rounded-full",
                                isUnlimitedEmbers ? "bg-white" : "bg-stone-600"
                            )}
                        />
                    </div>
                  </button>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-3 text-[9px] font-bold text-stone-600 uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 bg-forge-accent rounded-full animate-ping" />
                          Real-time Metrics Tracking: Enabled
                      </div>
                  </div>
              </div>
             ) : (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1 text-stone-500">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                        <MessageSquare size={12} />
                        Global Broadcast
                      </label>
                      <button 
                        onClick={() => setAboutMeMessage(`Hi, I’m Wana, I’m a 16 year-old student currently in 10th-grade. While studying for tests I realized that the tools we use to study are either too expensive or just don't work the way we actually learn.

The Mission: Why Study Forge?

I built Study Forge because I was tired of hitting paywalls for basic study features. I wanted to create a 'Student OS' (operating system) that focuses on actual understanding, not just memorization.

Using Google AI Studio, I developed the Academic Assistant to act as a tutor guiding you through concepts in Chemistry or Geometry rather than just handing over the answers. My goal is to help us all maintain high grades and understanding essential concepts while actually having time for a life outside of school.

Please keep in mind that Study Forge is currently in its Beta stage. As a student developer, I’m constantly shipping updates, fixing bugs, and adding new features like the Embers Shop and Community Vault.

By using the app now, you are a "Founding Member." Your feedback directly shapes how this tool grows. If you find a bug or have a feature request, let me know—I’m building this for us.`)}
                        className="text-[8px] font-black uppercase text-forge-accent hover:underline"
                      >
                        Load Official Mission
                      </button>
                    </div>
                    <textarea 
                      value={aboutMeMessage}
                      onChange={(e) => setAboutMeMessage(e.target.value)}
                      placeholder="Type your global message..."
                      className="w-full h-48 bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-white text-sm font-medium outline-none focus:border-white/20 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
                        <ImageIcon size={12} />
                        Visual Assets
                      </label>
                      <button 
                        onClick={addImageUrl}
                        className="text-[9px] font-black uppercase text-forge-accent hover:underline"
                      >
                        Add URL
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <AnimatePresence>
                        {aboutMeImages.map((url, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="relative group w-16 h-16 rounded-xl overflow-hidden border border-white/10"
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => removeImage(idx)}
                              className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {aboutMeImages.length === 0 && (
                        <div className="w-full py-8 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-stone-600">
                           <ImageIcon size={24} className="mb-2 opacity-20" />
                           <p className="text-[9px] font-bold uppercase tracking-widest">No images linked</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={isSaving}
                    onClick={handleSaveAboutMe}
                    className="w-full py-4 bg-white text-forge-dark rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border-2 border-forge-dark/30 border-t-forge-dark rounded-full animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Deploy Changes
                  </button>
               </div>
             )}
             
             <p className="text-center text-[8px] text-stone-700 font-bold uppercase tracking-[0.3em]">
                 Unauthorized access to academy archives is logged.
             </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
