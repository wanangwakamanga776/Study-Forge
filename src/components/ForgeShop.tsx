import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Check, Flame, Star, Palette, Shield, Sparkles, UserCircle, Zap, FastForward } from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';

type ShopTab = 'themes' | 'items' | 'skins' | 'upgrades';

export function ForgeShop({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { 
    embers, 
    currentTheme, 
    setTheme, 
    unlockedThemes, 
    unlockTheme, 
    spendEmbers,
    activeAssistantSkin,
    unlockedSkins,
    unlockSkin,
    setSkin,
    unlockedItems,
    unlockItem,
    activateBooster,
    addBadge,
    badges
  } = useForgeStore();

  const [activeTab, setActiveTab] = useState<ShopTab>('themes');
  const [error, setError] = useState<string | null>(null);

  const themeList = [
    { name: 'Default Ember', color: '#FB923C', desc: 'Classic academic warm. Focus-driven.', price: 0 },
    { name: 'Deep Sea Blue', color: '#3B82F6', desc: 'Sub-aquatic immersion with rising bubbles and ocean depth.', price: 500 },
    { name: 'Midnight Purple', color: '#A855F7', desc: 'Cosmic plasma field with pulsing interstellar orbs.', price: 500 },
    { name: 'Matrix Code', color: '#22C55E', desc: 'Digital archive stream with falling Katakana data rain.', price: 750 },
    { name: 'Inferno', color: '#EF4444', desc: 'Live atmospheric flames and kinetic heat ripples on interaction.', price: 1000 }
  ];

  const itemsList = [
    { id: 'streak_freeze', name: 'The Final Shield', price: 500, desc: 'Protects your streak if you miss a day.', icon: <Shield size={24} /> },
    { id: 'focus_shield', name: 'The All-Nighter', price: 300, desc: 'Prevents XP loss for 12 hours if focus fails.', icon: <Shield size={24} /> },
    { id: 'verified_badge', name: 'Verified Scholar', price: 2000, desc: 'A blue checkmark for public deck creators.', icon: <Star size={24} />, isBadge: true },
    { id: 'gilded_cover', name: 'Golden Gilded Cover', price: 750, desc: 'Makes your deck glow in results.', icon: <Sparkles size={24} /> },
    { id: 'ghost_mode', name: 'The Ghost', price: 150, desc: 'Study in Incognito mode.', icon: <UserCircle size={24} /> },
  ];

  const skinsList = [
    { id: 'sergeant', name: 'The Drill Sergeant', price: 600, desc: 'Strict discipline persona.', skin: 'Drill Sergeant' },
    { id: 'zen', name: 'The Zen Master', price: 600, desc: 'Calm nature analogies.', skin: 'Zen Master' },
    { id: 'rival', name: 'The Rival', price: 600, desc: 'Competitive student persona.', skin: 'Rival' },
  ];

  const upgradesList = [
    { id: 'xray', name: 'X-Ray Vision', price: 400, desc: 'Deep scan token for assignments.', icon: <Zap size={24} /> },
    { id: 'power_hour', name: 'Power Hour', price: 1000, desc: '2x Embers for the next 60 minutes.', icon: <FastForward size={24} />, isBooster: true },
  ];

  const handlePurchase = (item: any, type: ShopTab) => {
    const isOwned = type === 'themes' ? unlockedThemes.includes(item.name) :
                    type === 'skins' ? unlockedSkins?.includes(item.skin) :
                    unlockedItems?.includes(item.id);

    if (isOwned) {
      if (type === 'themes') setTheme(item.name);
      if (type === 'skins') setSkin(item.skin);
      soundService.playClick();
      return;
    }

    if (spendEmbers(item.price)) {
      if (type === 'themes') unlockTheme(item.name);
      if (type === 'skins') unlockSkin(item.skin);
      if (type === 'items') {
        if (item.isBadge) addBadge(item.name);
        else unlockItem(item.id);
      }
      if (type === 'upgrades') {
        if (item.isBooster) activateBooster('Power Hour');
        else unlockItem(item.id);
      }
      soundService.playSuccess();
      setError(null);
    } else {
      setError(`Not enough Embers to purchase ${item.name || item.id}.`);
      soundService.playProcess();
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
            className="relative w-full max-w-3xl h-[80vh] bg-forge-dark border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-8 sm:p-12 flex-1 overflow-y-auto metallic-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-forge-accent/20 text-forge-accent rounded-2xl">
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Academic Emporium</h2>
                    <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Gear up for Excellence</p>
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

              {/* Tabs */}
              <div className="flex gap-2 mb-8 border-b border-white/5 pb-4">
                {(['themes', 'items', 'skins', 'upgrades'] as ShopTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-forge-accent text-forge-dark" : "text-stone-500 hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Themes Tab */}
                  {activeTab === 'themes' && themeList.map((theme) => {
                    const isUnlocked = unlockedThemes.includes(theme.name);
                    const isActive = currentTheme === theme.name;
                    return (
                      <ShopItem 
                        key={theme.name}
                        name={theme.name}
                        desc={theme.desc}
                        price={theme.price}
                        isUnlocked={isUnlocked}
                        isActive={isActive}
                        icon={<Palette size={24} style={{ color: theme.color }} />}
                        color={theme.color}
                        onClick={() => handlePurchase(theme, 'themes')}
                      />
                    );
                  })}

                  {/* Items Tab */}
                  {activeTab === 'items' && itemsList.map((item) => {
                    const isOwned = item.isBadge ? badges?.includes(item.name) : unlockedItems?.includes(item.id);
                    return (
                      <ShopItem 
                        key={item.id}
                        name={item.name}
                        desc={item.desc}
                        price={item.price}
                        isUnlocked={isOwned}
                        icon={item.icon}
                        onClick={() => handlePurchase(item, 'items')}
                      />
                    );
                  })}

                  {/* Skins Tab */}
                  {activeTab === 'skins' && skinsList.map((skin) => {
                    const isOwned = unlockedSkins?.includes(skin.skin);
                    const isActive = activeAssistantSkin === skin.skin;
                    return (
                      <ShopItem 
                        key={skin.id}
                        name={skin.name}
                        desc={skin.desc}
                        price={skin.price}
                        isUnlocked={isOwned}
                        isActive={isActive}
                        icon={<UserCircle size={24} />}
                        onClick={() => handlePurchase(skin, 'skins')}
                      />
                    );
                  })}

                  {/* Upgrades Tab */}
                  {activeTab === 'upgrades' && upgradesList.map((up) => {
                    const isOwned = unlockedItems?.includes(up.id);
                    return (
                      <ShopItem 
                        key={up.id}
                        name={up.name}
                        desc={up.desc}
                        price={up.price}
                        isUnlocked={isOwned}
                        icon={up.icon}
                        onClick={() => handlePurchase(up, 'upgrades')}
                      />
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ShopItem({ name, desc, price, isUnlocked, isActive, icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
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
        style={color ? { backgroundColor: color + '20', border: `2px solid ${color}` } : { backgroundColor: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}
      >
        <span style={color ? { color: color } : { color: '#fff' }}>{icon}</span>
      </div>
      <h3 className="text-sm font-black text-white uppercase mb-1">{name}</h3>
      <p className="text-[10px] text-stone-500 font-bold uppercase mb-4 leading-tight">{desc}</p>
      
      <div className={cn(
        "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
        isActive 
          ? "bg-forge-accent text-forge-dark" 
          : isUnlocked 
            ? "bg-white/10 text-white" 
            : "bg-white/5 text-stone-400 group-hover:bg-forge-accent group-hover:text-forge-dark"
      )}>
        {isActive ? "Active" : isUnlocked ? "Apply" : `${price} Embers`}
      </div>
      
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-forge-accent rounded-full flex items-center justify-center text-forge-dark">
          <Check size={12} />
        </div>
      )}
    </button>
  );
}

