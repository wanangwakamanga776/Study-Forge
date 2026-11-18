import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, X, Check, Flame, Star, Palette, Shield, Sparkles, UserCircle, Zap, 
  FastForward, Clock, Brain, Layers, CheckCircle2, Lightbulb, Split, Waves, Ghost, 
  Search, Snowflake, Crosshair, Castle, Atom, GraduationCap, Medal, Rocket 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';
import { PyraMascot } from './PyraMascot';

type ShopTab = 'themes' | 'tactical' | 'skins' | 'global';

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
    badges,
    purchaseEmberItem,
    updateAtmosphere
  } = useForgeStore();

  const [activeTab, setActiveTab] = useState<ShopTab>('tactical');
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  const themeList = [
    { name: 'Default Ember', color: '#FB923C', desc: 'Classic warm study vibe. Standard focus atmosphere.', price: 0, icon: <Flame size={24} className="text-[#FB923C] drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" /> },
    { name: 'Map Explorer', color: '#1C1C1C', desc: 'Explore new ideas. Every study session builds your mental map.', price: 4000, id: 'void_cartographer', rarity: 'Epic', icon: <Search size={24} className="text-[#9CA3AF] drop-shadow-[0_0_8px_rgba(156,163,175,0.5)]" /> },
    { name: 'Inner Fire', color: '#991B1B', desc: 'True mastery is built through practice. High energy focus.', price: 5500, id: 'deep_forge', rarity: 'Epic', icon: <Crosshair size={24} className="text-[#991B1B] drop-shadow-[0_0_8px_rgba(153,27,27,0.5)]" /> },
    { name: 'Radio Mystery', color: '#1E1B4B', desc: 'Find clarity in the noise. Like tuning into a secret signal.', price: 3200, id: 'signal_lost', rarity: 'Rare', icon: <Waves size={24} className="text-[#818CF8] drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" /> },
    { name: 'Grand Archive', color: '#451A03', desc: 'An endless library where every learned card adds a new book.', price: 6000, id: 'the_library_at_the_end', rarity: 'Legendary', icon: <Layers size={24} className="text-[#D4A373] drop-shadow-[0_0_8px_rgba(212,163,115,0.5)]" /> },
    { name: 'Perfect Focus', color: '#064E3B', desc: 'The state of complete concentration where everything clicks.', price: 4500, id: 'eigenstate', rarity: 'Epic', icon: <Brain size={24} className="text-[#34D399] drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> },
    { name: 'Brain Link', color: '#4C0519', desc: 'Upgrade your biology. Learned cards build permanent connections.', price: 7000, id: 'bone_circuit', rarity: 'Legendary', icon: <Zap size={24} className="text-[#F43F5E] drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> },
    { name: 'Deep Ocean', color: '#172554', desc: 'Pure focus under deep water. Quiet, calm, and bioluminescent.', price: 2500, id: 'abyssal_current', rarity: 'Rare', icon: <Waves size={24} className="text-[#60A5FA] drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" /> },
    { name: 'Star Field', color: '#2E1065', desc: 'Your knowledge is written in the stars. Every session births a sun.', price: 3500, id: 'nebula_pulse', rarity: 'Rare', icon: <Sparkles size={24} className="text-[#A78BFA] drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" /> }
  ];

  const tacticalList = [
    { id: 'neural_nudge', name: 'Brain Boost', price: 5, desc: 'A helpful push in the right direction. Hints and clues.', icon: <Lightbulb size={24} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> },
    { id: 'temporal_splice', name: 'Smart Fix', price: 8, desc: 'Analyzes your mistakes and explains exactly HOW to improve.', icon: <Split size={24} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" /> },
    { id: 'echo_chamber', name: 'Memory Hooks', price: 10, desc: 'Catchy mnemonics, stories, and tricks to remember.', icon: <Waves size={24} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" /> },
    { id: 'phantom_recall', name: 'Error Scan', price: 15, desc: 'Deep analysis of patterns in your repeated mistakes.', icon: <Ghost size={24} className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" /> },
    { id: 'deep_dive', name: 'Step-by-Step Explainer', price: 15, desc: 'Breaks difficult concepts into simple, easy steps.', icon: <Search size={24} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> },
    { id: 'cryo_shield', name: 'Streak Shield', price: 20, desc: 'Restores your streak if you miss a study day.', icon: <Snowflake size={24} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" /> },
    { id: 'kill_chain', name: 'Mastery Plan', price: 25, desc: 'A personalized 5-step roadmap to master this topic.', icon: <Crosshair size={24} className="text-orange-600 drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]" /> },
    { id: 'memory_palace', name: 'Mind Map', price: 35, desc: 'Visual connections that link ideas across the entire topic.', icon: <Castle size={24} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" /> },
    { id: 'void_collapse', name: 'Full Reset', price: 50, desc: 'Rebuild your understanding step-by-step from zero.', icon: <Atom size={24} className="text-white animate-spin-slow drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" /> },
    { id: 'forge_exam', name: 'Final Challenge', price: 50, desc: 'A custom exam focused heavily on your weak spots.', icon: <GraduationCap size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> },
  ];

  const skinsList = [
    { id: 'sergeant', name: 'Coach Pyra', price: 1200, desc: 'Strict but effective study coach. No excuses!', skin: 'Drill Sergeant' },
    { id: 'zen', name: 'Peaceful Pyra', price: 1200, desc: 'Calm and steady study vibes for deep focus.', skin: 'Zen Master' },
    { id: 'rival', name: 'Ace Student', price: 1200, desc: 'Competitive mode for high-stakes study.', skin: 'Rival' },
    { id: 'ghost_protocol', name: 'Spy Mode', price: 1800, desc: 'Intel-style analysis: SITUATION → ANALYSIS → ACTION.', skin: 'Ghost Protocol' },
    { id: 'oracle_prime', name: 'Ancient Sage', price: 2500, desc: 'Deep wisdom from the library of all human knowledge.', skin: 'Oracle Prime' },
    { id: 'circuit_breaker', name: 'Digital Pyra', price: 1500, desc: 'High-speed technical style for fast learners.', skin: 'Circuit Breaker' },
    { id: 'the_archivist', name: 'Librarian', price: 3000, desc: 'Knowledge keeper who connects everything you learn.', skin: 'The Archivist' },
    { id: 'forge_wraith', name: 'Ultimate Pyra', price: 5000, desc: 'Intense and heroic style for the final push.', skin: 'Forge Wraith' },
  ];

  const globalList = [
    { id: 'verified_badge', name: 'Top Student', price: 5000, desc: 'A shiny blue badge to show you are a master creator.', icon: <Medal size={24} className="text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />, isBadge: true },
    { id: 'overdrive', name: 'Double XP', price: 1500, desc: 'Earn 2x the fire for 60 minutes of study.', icon: <Rocket size={24} className="text-forge-accent animate-bounce drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]" />, isBooster: true },
  ];

  const handlePurchase = async (item: any, type: ShopTab) => {
    if (type === 'tactical') {
      try {
        const result = await purchaseEmberItem(item.id, { topic: 'General Mastery' });
        setPurchaseResult(result);
        soundService.playSuccess();
        return;
      } catch (err: any) {
        setError(err.message);
        soundService.playError();
        return;
      }
    }

    const isOwned = type === 'themes' ? unlockedThemes.includes(item.name) :
                    type === 'skins' ? unlockedSkins?.includes(item.skin) :
                    unlockedItems?.includes(item.id);

    if (isOwned) {
      if (type === 'themes') {
        setTheme(item.name);
        updateAtmosphere('session_start', undefined, item.name);
      }
      if (type === 'skins') setSkin(item.skin);
      soundService.playClick();
      return;
    }

    if (spendEmbers(item.price)) {
      if (type === 'themes') {
        unlockTheme(item.name);
        updateAtmosphere('session_start', undefined, item.name);
      }
      if (type === 'skins') unlockSkin(item.skin);
      if (type === 'global') {
        if (item.isBadge) addBadge(item.name);
        else if (item.isBooster) activateBooster('Power Hour');
        else unlockItem(item.id);
      }
      soundService.playSuccess();
      setError(null);
    } else {
      setError(`Not enough Embers to purchase ${item.name || item.id}.`);
      soundService.playError();
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
                {(['tactical', 'themes', 'skins', 'global'] as ShopTab[]).map(tab => (
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
                {purchaseResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-[2rem] bg-white/5 border border-forge-accent/30 text-left mb-8 relative"
                  >
                    <button 
                      onClick={() => setPurchaseResult(null)}
                      className="absolute top-4 right-4 text-stone-500 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                    <div className="flex items-center gap-2 text-forge-accent text-[10px] font-black uppercase tracking-widest mb-4">
                      <Sparkles size={14} /> {purchaseResult.reward_content.type}
                    </div>
                    <div className="text-sm text-stone-300 leading-relaxed mb-6 prose prose-invert max-w-none">
                      <ReactMarkdown>{purchaseResult.reward_content.content}</ReactMarkdown>
                    </div>
                    {purchaseResult.reward_content.follow_up_action && (
                      <div className="p-4 bg-forge-accent/10 rounded-xl border border-forge-accent/20 text-[10px] font-black uppercase tracking-widest text-forge-accent">
                        Next Action: {purchaseResult.reward_content.follow_up_action}
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Tactical Tab */}
                  {activeTab === 'tactical' && tacticalList.map((item) => (
                    <ShopItem 
                      key={item.id}
                      name={item.name}
                      desc={item.desc}
                      price={item.price}
                      isUnlocked={false}
                      icon={item.icon}
                      rarity="Tactical"
                      onClick={() => handlePurchase(item, 'tactical')}
                    />
                  ))}

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
                        icon={theme.icon || <Palette size={24} style={{ color: theme.color }} />}
                        color={theme.color}
                        rarity={theme.rarity}
                        onClick={() => handlePurchase(theme, 'themes')}
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
                        icon={
                          <div className="scale-75 origin-center">
                            <PyraMascot expression="happy" skinOverride={skin.skin} />
                          </div>
                        }
                        rarity="Persona"
                        onClick={() => handlePurchase(skin, 'skins')}
                      />
                    );
                  })}

                  {/* Global Tab */}
                  {activeTab === 'global' && globalList.map((up) => {
                    const isOwned = up.isBadge ? badges?.includes(up.name) : unlockedItems?.includes(up.id);
                    return (
                      <ShopItem 
                        key={up.id}
                        name={up.name}
                        desc={up.desc}
                        price={up.price}
                        isUnlocked={isOwned}
                        icon={up.icon}
                        rarity={up.isBadge ? "Achievement" : "Booster"}
                        onClick={() => handlePurchase(up, 'global')}
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



function ShopItem({ name, desc, price, isUnlocked, isActive, icon, color, rarity, onClick }: any) {
  const getRarityColor = (r: string) => {
    switch (r?.toLowerCase()) {
      case 'rare': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'epic': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'legendary': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'persona': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'tactical': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'booster': return 'text-forge-accent bg-forge-accent/10 border-forge-accent/20';
      case 'achievement': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      default: return 'text-stone-500 bg-stone-500/10 border-stone-500/20';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative p-6 rounded-[2.5rem] border-2 transition-all text-left flex flex-col items-center justify-center text-center overflow-hidden",
        isActive 
          ? "border-forge-accent bg-forge-accent/10 shadow-[0_0_40px_rgba(251,146,60,0.15)]" 
          : isUnlocked 
            ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]" 
            : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      {/* Rarity Tag */}
      {rarity && (
        <div className={cn(
          "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border",
          getRarityColor(rarity)
        )}>
          {rarity}
        </div>
      )}

      <div 
        className={cn(
          "w-20 h-20 rounded-3xl mb-4 shadow-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3",
          !color && "bg-white/5 border border-white/10"
        )}
        style={color ? { backgroundColor: color + '15', border: `2px solid ${color}30` } : {}}
      >
        <span style={color ? { color: color } : { color: '#fff' }} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          {icon}
        </span>
      </div>
      
      <h3 className="text-sm font-black text-white uppercase mb-1 tracking-tight">{name}</h3>
      <p className="text-[10px] text-stone-500 font-bold uppercase mb-6 leading-tight max-w-[140px] h-8 flex items-center justify-center">
        {desc}
      </p>
      
      <div className={cn(
        "w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
        isActive 
          ? "bg-forge-accent text-forge-dark shadow-lg" 
          : isUnlocked 
            ? "bg-white/10 text-white hover:bg-white/20" 
            : "bg-white/5 text-stone-400 group-hover:bg-forge-accent group-hover:text-forge-dark group-hover:shadow-[0_0_20px_rgba(251,146,60,0.4)]"
      )}>
        {isActive ? "Equipped" : isUnlocked ? "Equip" : `${price} Embers`}
      </div>
      
      {isActive && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 left-2 w-6 h-6 bg-forge-accent rounded-full flex items-center justify-center text-forge-dark shadow-lg translate-x-1 translate-y-1"
        >
          <Check size={14} strokeWidth={4} />
        </motion.div>
      )}
    </button>
  );
}

