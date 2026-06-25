import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { cn } from '../lib/utils';

interface ThemeVisualsProps {
  isSidebarCollapsed?: boolean;
}

export function ThemeVisuals({ isSidebarCollapsed }: ThemeVisualsProps) {
  const { currentTheme, atmosphere, decks, stats } = useForgeStore();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [quotaLow, setQuotaLow] = useState(false);

  useEffect(() => {
    const handle = (e: any) => setQuotaLow(e.detail.isQuotaLow);
    window.addEventListener('forge_quota_status_changed', handle);
    return () => window.removeEventListener('forge_quota_status_changed', handle);
  }, []);
  
  // Dynamic assets based on theme
  const [assets, setAssets] = useState<any[]>([]);

  // Advanced reactive signals
  const masteredCount = useMemo(() => decks.filter(d => (d.mastery_score || 0) >= 80).length, [decks]);
  const srsRetention = useMemo(() => stats.srsRetention || 0, [stats.srsRetention]);
  const streak = useMemo(() => stats.dailyStreak || 0, [stats.dailyStreak]);

  const themeConfig = useMemo(() => {
    switch (currentTheme) {
      case 'Map Explorer':
      case 'Void Cartographer':
        return {
          bgGlow: 'from-stone-950/90',
          particleClass: 'ink-blot',
          particleCount: 12 + masteredCount,
          rippleColor: 'border-stone-400/20 bg-stone-400/5',
          interactive: true,
          overlayType: 'void' as const,
          vignette: 'radial-gradient(circle, transparent 20%, rgba(0, 0, 0, 1) 100%)'
        };
      case 'Inner Fire':
      case 'Deep Forge':
        return {
          bgGlow: 'from-red-950/80',
          particleClass: 'ember',
          particleCount: 30 + (streak * 5),
          rippleColor: 'border-red-500/20 bg-red-500/5',
          interactive: true,
          overlayType: 'forge' as const,
          vignette: `radial-gradient(circle, transparent 20%, rgba(69, 10, 10, ${0.4 + streak * 0.05}) 100%)`
        };
      case 'Radio Mystery':
      case 'Signal Lost':
        return {
          bgGlow: 'from-indigo-950/90',
          particleClass: 'static-glitch',
          particleCount: 40,
          rippleColor: 'border-indigo-400/20 bg-indigo-400/5',
          interactive: true,
          overlayType: 'signal' as const,
          vignette: 'linear-gradient(rgba(18, 24, 27, 0.1) 50%, rgba(0, 0, 0, 0.2) 50%), radial-gradient(circle, transparent 40%, rgba(30, 27, 75, 0.9) 100%)'
        };
      case 'Grand Archive':
      case 'The Library at the End':
        return {
          bgGlow: 'from-amber-950/50',
          particleClass: 'parchment-flake',
          particleCount: 15 + masteredCount,
          rippleColor: 'border-amber-600/20 bg-amber-600/5',
          interactive: true,
          overlayType: 'library' as const,
          vignette: 'radial-gradient(circle, transparent 30%, rgba(67, 20, 7, 0.8) 100%)'
        };
      case 'Perfect Focus':
      case 'Eigenstate':
        return {
          bgGlow: 'from-emerald-950/60',
          particleClass: 'wavefunction',
          particleCount: 6,
          rippleColor: 'border-emerald-400/20 bg-emerald-400/5',
          interactive: true,
          overlayType: 'quantum' as const,
          vignette: 'radial-gradient(circle, transparent 20%, rgba(2, 44, 34, 0.9) 100%)'
        };
      case 'Brain Link':
      case 'Bone Circuit':
        return {
          bgGlow: 'from-rose-950/60',
          particleClass: 'neural-spark',
          particleCount: 20 + masteredCount,
          rippleColor: 'border-rose-400/20 bg-rose-400/5',
          interactive: true,
          overlayType: 'biopunk' as const,
          vignette: 'radial-gradient(circle, transparent 20%, rgba(76, 5, 25, 0.8) 100%)'
        };
      case 'Deep Ocean':
      case 'Abyssal Station':
      case 'Abyssal Current':
        return {
          bgGlow: 'from-blue-950/90',
          particleClass: 'deep-sea-bubble',
          particleCount: 15,
          rippleColor: 'border-blue-400/20 bg-blue-400/5',
          interactive: true,
          overlayType: 'abyssal' as const,
          vignette: 'radial-gradient(circle, transparent 30%, rgba(8, 47, 73, 0.9) 100%)'
        };
      case 'Star Field':
      case 'Stellar Nursery':
      case 'Nebula Pulse':
        return {
          bgGlow: 'from-purple-950/80',
          particleClass: 'singularity',
          particleCount: 4,
          rippleColor: 'border-purple-500/20 bg-purple-500/5',
          interactive: true,
          overlayType: 'nebula' as const,
          vignette: 'radial-gradient(circle, transparent 10%, rgba(61, 12, 110, 0.8) 100%)'
        };
      default:
        return null;
    }
  }, [currentTheme, masteredCount, streak, srsRetention]);

  const renderOverlay = () => {
    if (!themeConfig) return null;
    switch (themeConfig.overlayType) {
      case 'void':
        return (
          <>
            <div className="absolute inset-0 bg-stone-950/30 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none" />
            <div className="absolute inset-0 z-0 overflow-hidden">
               {decks.filter(d => (d.mastery_score || 0) >= 70).map((deck, i) => (
                 <motion.div
                   key={deck.id}
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 0.15 }}
                   className="absolute bg-stone-100 rounded-full blur-[60px]"
                   style={{
                     left: `${(i * 137) % 80 + 10}%`,
                     top: `${(i * 243) % 80 + 10}%`,
                     width: `${Math.max(100, (deck.mastery_score || 0) * 4)}px`,
                     height: `${Math.max(100, (deck.mastery_score || 0) * 2)}px`,
                     transform: `rotate(${i * 45}deg)`
                   }}
                 />
               ))}
            </div>
          </>
        );
      case 'forge':
        return (
          <>
            <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay animate-pulse pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-red-700/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-12 right-12 opacity-40">
               <svg width="200" height="200" viewBox="0 0 100 100">
                 <motion.path
                   d={srsRetention > 80 ? "M20,80 L80,20 L85,15 L90,20 L20,90 Z" : "M30,70 L70,30 C80,20 85,35 70,50 L50,70 Z"}
                   stroke="#991B1B"
                   strokeWidth="2"
                   fill="rgba(153, 27, 27, 0.2)"
                   animate={{ 
                     filter: [`blur(${Math.max(0, 10 - srsRetention/10)}px)`, `blur(${Math.max(0, 8 - srsRetention/10)}px)`],
                     scale: [1, 1.05, 1]
                   }}
                   transition={{ duration: 3, repeat: Infinity }}
                 />
               </svg>
            </div>
          </>
        );
      case 'signal':
        return (
          <>
            <div className="absolute inset-0 scanline-crt opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-indigo-950/20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-32 opacity-10">
              <svg width="100%" height="100%">
                <motion.path
                  d="M0,64 Q100,0 200,64 T400,64 T600,64 T800,64 T1000,64"
                  stroke="#818CF8"
                  strokeWidth="2"
                  fill="none"
                  animate={{ d: [
                    "M0,64 Q100,0 200,64 T400,64 T600,64 T800,64 T1000,64",
                    "M0,64 Q100,128 200,64 T400,64 T600,64 T800,64 T1000,64",
                    "M0,64 Q100,0 200,64 T400,64 T600,64 T800,64 T1000,64"
                  ] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            </div>
          </>
        );
      case 'library':
        return (
          <>
            <div className="absolute inset-0 bg-amber-950/20 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/vintage-paper.png')] opacity-10 pointer-events-none" />
            <div className="absolute left-0 top-0 w-32 h-full border-r border-amber-900/40 bg-amber-950/20 z-0">
               <div className="flex flex-col gap-8 p-4">
                 {decks.map((deck, i) => (
                   <motion.div
                     key={deck.id}
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: deck.mastery_score ? deck.mastery_score / 100 : 0.1 }}
                     className="h-1 w-full bg-amber-600/50 rounded-full"
                   />
                 ))}
               </div>
            </div>
          </>
        );
      case 'quantum':
        return (
          <>
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity }}
                className="w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px]"
              />
            </div>
          </>
        );
      case 'biopunk':
        return (
          <>
            <div className="absolute inset-0 bg-rose-900/10 pointer-events-none" />
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <linearGradient id="veinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="100%" stopColor="#4C0519" />
                </linearGradient>
              </defs>
              {decks.map((deck, i) => (
                <motion.line
                  key={deck.id}
                  x1="50%" y1="50%"
                  x2={`${(i * 17) % 100}%`} y2={`${(i * 41) % 100}%`}
                  stroke="url(#veinGrad)"
                   strokeWidth={(deck.mastery_score || 0) / 40 + 1}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </svg>
          </>
        );
      case 'abyssal':
        return (
          <>
            <div className="absolute inset-0 caustics-layer pointer-events-none" />
            <div className="absolute inset-0 bg-blue-950/40 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/20 to-black pointer-events-none" />
            <div className="absolute bottom-12 left-12 font-mono text-[10px] text-blue-400/60 uppercase tracking-widest">
               Pressure: {(streak * 12.5).toFixed(1)} atm <br/>
               Depth: {4000 + stats.totalSessionsStudied * 10}m
            </div>
          </>
        );
      case 'nebula':
        return (
          <>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-pink-900/20 pointer-events-none" />
            <div className="absolute inset-0 overflow-hidden">
               {decks.filter(d => (d.mastery_score || 0) >= 90).map((deck, i) => (
                 <motion.div
                   key={deck.id}
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_#fff]"
                   style={{
                     left: `${(i * 149) % 90 + 5}%`,
                     top: `${(i * 263) % 90 + 5}%`
                   }}
                 >
                    <div className="absolute top-4 left-0 text-[6px] text-white/40 font-mono whitespace-nowrap rotate-45">{deck.title}</div>
                 </motion.div>
               ))}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!themeConfig) {
      setAssets([]);
      return;
    }

    const baseCount = themeConfig.particleCount;
    const finalCount = quotaLow ? Math.ceil(baseCount * 0.3) : baseCount;

    const newAssets = Array.from({ length: finalCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: (themeConfig.particleClass === 'singularity' || themeConfig.particleClass === 'ember' || themeConfig.particleClass === 'ink-blot') ? `${Math.random() * 100}%` : undefined,
      size: (themeConfig.particleClass === 'singularity' || themeConfig.particleClass === 'wavefunction')
        ? `${Math.random() * 100 + 50}px`
        : themeConfig.particleClass === 'ember'
        ? `${Math.random() * 4 + 2}px`
        : `${Math.random() * 40 + 20}px`,
      duration: themeConfig.particleClass === 'ember' 
        ? `${Math.random() * 6 + 4}s`
        : `${Math.random() * 12 + 8}s`,
      delay: `${Math.random() * 15}s`,
      content: null
    }));
    setAssets(newAssets);
  }, [themeConfig]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!themeConfig?.interactive) return;
    
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY, color: themeConfig.rippleColor }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, [themeConfig]);

  useEffect(() => {
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [handleClick]);

  if (!themeConfig) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-t ${themeConfig.bgGlow} via-transparent to-transparent`} />
      
      {/* Vignette / Overlay Layer */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ background: themeConfig.vignette }}
      />
      
      {renderOverlay()}

      {/* Moving Particles */}
      {assets.map(asset => (
        <div
          key={asset.id}
          className={themeConfig.particleClass}
          style={{
            left: asset.left,
            top: asset.top,
            width: asset.size,
            height: asset.size,
            fontSize: asset.size,
            '--duration': asset.duration,
            animationDelay: asset.delay,
          } as any}
        >
          {asset.content}
        </div>
      ))}

      {/* Click Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className={`fixed pointer-events-none z-[9999] rounded-full border ${ripple.color}`}
            style={{
              left: ripple.x - 25,
              top: ripple.y - 25,
              width: 50,
              height: 50,
              animation: 'heat-ripple 0.6s ease-out forwards'
            }}
          />
        ))}
      </AnimatePresence>
      {/* Atmosphere Tooltip */}
      <AnimatePresence>
        {atmosphere && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "fixed bottom-6 lg:bottom-8 left-6 right-6 lg:right-auto z-[60] bg-forge-dark/60 backdrop-blur-md border border-white/10 p-3 rounded-xl max-w-xs pointer-events-auto shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isSidebarCollapsed ? "lg:left-28" : "lg:left-80"
            )}
          >
             <p className="text-[10px] font-black text-forge-accent uppercase tracking-widest mb-1">Atmospheric Scan</p>
             <p className="text-xs text-stone-300 font-bold leading-tight">{atmosphere.ambient_descriptor}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
