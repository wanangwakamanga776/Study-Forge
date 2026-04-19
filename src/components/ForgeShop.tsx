import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Check, Flame, Star, Palette } from 'lucide-react';
import { useForgeStore, THEMES } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';

export function ForgeShop({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { embers, currentTheme, setTheme, unlockedThemes, unlockTheme, spendEmbers } = useForgeStore();
  const [error, setError] = useState<string | null>(null);

  const themeList = [
    { name: 'Default Ember', color: '#FB923C', desc: 'Classic furnace heat.' },
    { name: 'Deep Sea Blue', color: '#3B82F6', desc: 'Arcane underwater forge.' },
    { name: 'Midnight Purple', color: '#A855F7', desc: 'High-energy plasma smithing.' }
  ];

  const handleBuy = (themeName: string) => {
    if (unlockedThemes.includes(themeName)) {
      setTheme(themeName);
      soundService.playClick();
      return;
    }

    if (spendEmbers(500)) {
      unlockTheme(themeName);
      setTheme(themeName);
      soundService.playSuccess();
      setError(null);
    } else {
      setError("Not enough Embers to ignite this theme, apprentice.");
      soundService.playSmelt(); // sound for error
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-forge-dark border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8 sm:p-12">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-forge-accent/20 text-forge-accent rounded-2xl">
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Forge Shop</h2>
                    <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Customize Your Ascent</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-forge-accent/10 border border-forge-accent/20 rounded-xl flex items-center gap-2">
                    <Flame size={16} className="text-forge-accent animate-pulse" />
                    <span className="text-lg font-black text-white">{embers}</span>
                  </div>
                  <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                    <X size={28} />
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {themeList.map((theme) => {
                    const isUnlocked = unlockedThemes.includes(theme.name);
                    const isActive = currentTheme === theme.name;
                    
                    return (
                      <button
                        key={theme.name}
                        onClick={() => handleBuy(theme.name)}
                        className={cn(
                          "group relative p-6 rounded-3xl border-2 transition-all text-left flex flex-col items-center justify-center text-center",
                          isActive 
                            ? "border-forge-accent bg-forge-accent/10" 
                            : isUnlocked 
                              ? "border-white/10 bg-white/5 hover:border-white/20" 
                              : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                        )}
                      >
                        <div 
                          className="w-16 h-16 rounded-2xl mb-4 shadow-lg flex items-center justify-center"
                          style={{ backgroundColor: theme.color + '20', border: `2px solid ${theme.color}` }}
                        >
                          <Palette size={24} style={{ color: theme.color }} />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase mb-1">{theme.name}</h3>
                        <p className="text-[10px] text-stone-500 font-bold uppercase mb-4 leading-tight">{theme.desc}</p>
                        
                        <div className={cn(
                          "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                          isActive 
                            ? "bg-forge-accent text-forge-dark" 
                            : isUnlocked 
                              ? "bg-white/10 text-white" 
                              : "bg-white/5 text-stone-400 group-hover:bg-forge-accent group-hover:text-forge-dark"
                        )}>
                          {isActive ? "Active" : isUnlocked ? "Apply" : "500 Embers"}
                        </div>
                        
                        {isActive && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-forge-accent rounded-full flex items-center justify-center text-forge-dark">
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-widest text-center"
                  >
                    {error}
                  </motion.div>
                )}
              </div>

              <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-stone-400">
                    <Star size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">More Coming Soon</h4>
                    <p className="text-xs text-stone-500 uppercase font-bold tracking-widest">Master level blueprints are being smelted.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
