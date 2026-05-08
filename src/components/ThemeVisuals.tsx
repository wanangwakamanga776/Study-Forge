import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForgeStore } from '../contexts/ForgeStoreContext';

export function ThemeVisuals() {
  const { currentTheme } = useForgeStore();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  
  // Dynamic assets based on theme
  const [assets, setAssets] = useState<any[]>([]);

  const themeConfig = useMemo(() => {
    switch (currentTheme) {
      case 'Inferno':
        return {
          bgGlow: 'from-orange-900/60',
          particleClass: 'ember',
          particleCount: 50,
          rippleColor: 'border-orange-500/20 bg-orange-500/5',
          interactive: true,
          overlayType: 'inferno' as const,
          vignette: 'radial-gradient(circle, transparent 20%, rgba(127, 29, 29, 0.6) 100%)'
        };
      case 'Abyssal Current':
        return {
          bgGlow: 'from-blue-950/80',
          particleClass: 'deep-sea-bubble',
          particleCount: 20,
          rippleColor: 'border-blue-400/20 bg-blue-400/5',
          interactive: true,
          overlayType: 'abyssal' as const,
          vignette: 'radial-gradient(circle, transparent 30%, rgba(8, 47, 73, 0.8) 100%)'
        };
      case 'Nebula Pulse':
        return {
          bgGlow: 'from-purple-950/60',
          particleClass: 'singularity',
          particleCount: 6,
          rippleColor: 'border-purple-500/20 bg-purple-500/5',
          interactive: true,
          overlayType: 'nebula' as const,
          vignette: 'radial-gradient(circle, transparent 10%, rgba(61, 12, 110, 0.7) 100%)'
        };
      case 'Matrix Code':
        return {
          bgGlow: 'from-green-950/40',
          particleClass: 'matrix-column',
          particleCount: 60,
          rippleColor: 'border-green-500/30 bg-green-500/10',
          interactive: false,
          overlayType: 'matrix' as const,
          vignette: 'linear-gradient(rgba(0, 50, 0, 0.1) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(34, 197, 94, 0.05), transparent 50%, rgba(34, 197, 94, 0.05))'
        };
      default:
        return null;
    }
  }, [currentTheme]);

  const renderOverlay = () => {
    if (!themeConfig) return null;
    switch (themeConfig.overlayType) {
      case 'inferno':
        return (
          <>
            <div className="absolute inset-0 bg-orange-500/5 mix-blend-overlay animate-pulse pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/10 to-transparent pointer-events-none" />
            {/* Fire Tongues Base Layer */}
            <div className="absolute inset-x-0 bottom-0 h-64 flex justify-around pointer-events-none opacity-40">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="fire-tongue" 
                  style={{ 
                    left: `${i * 12 + Math.random() * 5}%`,
                    width: `${Math.random() * 100 + 100}px`,
                    '--duration': `${Math.random() * 3 + 2}s`
                  } as any} 
                />
              ))}
            </div>
          </>
        );
      case 'abyssal':
        return (
          <>
            <div className="absolute inset-0 caustics-layer pointer-events-none" />
            <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-blue-950/40 pointer-events-none" />
          </>
        );
      case 'nebula':
        return (
          <>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none" />
          </>
        );
      case 'matrix':
        return (
          <>
            <div className="absolute inset-0 matrix-grid-bg pointer-events-none" />
            <div className="absolute inset-0 matrix-noise pointer-events-none" />
            <div className="absolute inset-0 scanline-crt pointer-events-none opacity-20" />
            <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
            {/* Horizontal Code Artifacts */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-around overflow-hidden opacity-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="h-px w-full bg-green-500/20" style={{ transform: `translateX(${Math.random() * 100}%)` }} />
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

    const newAssets = Array.from({ length: themeConfig.particleCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: (themeConfig.particleClass === 'singularity' || themeConfig.particleClass === 'ember') ? `${Math.random() * 100}%` : undefined,
      size: themeConfig.particleClass === 'matrix-column' 
        ? `${Math.random() * 10 + 10}px`
        : themeConfig.particleClass === 'singularity'
        ? `${Math.random() * 150 + 100}px`
        : themeConfig.particleClass === 'ember'
        ? `${Math.random() * 4 + 2}px`
        : `${Math.random() * 60 + 40}px`,
      duration: themeConfig.particleClass === 'ember' 
        ? `${Math.random() * 10 + 5}s`
        : `${Math.random() * 8 + 4}s`,
      delay: `${Math.random() * 10}s`,
      content: themeConfig.particleClass === 'matrix-column' 
        ? Array.from({ length: 20 }).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('')
        : null
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
        style={{ background: themeConfig.vignette, backgroundSize: currentTheme === 'Matrix Code' ? '100% 4px, 4px 100%' : 'auto' }}
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
            width: themeConfig.particleClass === 'matrix-column' ? '1em' : asset.size,
            height: themeConfig.particleClass === 'matrix-column' ? 'auto' : asset.size,
            fontSize: asset.size,
            '--duration': asset.duration,
            animationDelay: asset.delay,
            opacity: themeConfig.particleClass === 'matrix-column' ? Math.random() * 0.5 + 0.2 : 1
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
    </div>
  );
}
