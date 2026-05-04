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
          bgGlow: 'from-red-900/20',
          particleClass: 'inferno-flame',
          particleCount: 30,
          rippleColor: 'border-red-500/20 bg-red-500/5',
          interactive: true
        };
      case 'Deep Sea Blue':
        return {
          bgGlow: 'from-blue-900/30',
          particleClass: 'deep-sea-bubble',
          particleCount: 20,
          rippleColor: 'border-blue-300/20 bg-blue-300/5',
          interactive: true
        };
      case 'Midnight Purple':
        return {
          bgGlow: 'from-purple-900/20',
          particleClass: 'plasma-orb',
          particleCount: 8,
          rippleColor: 'border-purple-400/20 bg-purple-400/5',
          interactive: true
        };
      case 'Matrix Code':
        return {
          bgGlow: 'from-green-900/10',
          particleClass: 'matrix-column',
          particleCount: 40,
          rippleColor: 'border-green-500/20 bg-green-500/5',
          interactive: false
        };
      default:
        return null;
    }
  }, [currentTheme]);

  useEffect(() => {
    if (!themeConfig) {
      setAssets([]);
      return;
    }

    const newAssets = Array.from({ length: themeConfig.particleCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: themeConfig.particleClass === 'plasma-orb' ? `${Math.random() * 100}%` : undefined,
      size: `${Math.random() * 40 + 20}px`,
      duration: `${Math.random() * 5 + 5}s`,
      delay: `${Math.random() * 10}s`,
      content: themeConfig.particleClass === 'matrix-column' 
        ? Array.from({ length: 15 }).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('')
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
      
      {/* Moving Particles */}
      {assets.map(asset => (
        <div
          key={asset.id}
          className={themeConfig.particleClass}
          style={{
            left: asset.left,
            top: asset.top,
            width: asset.size,
            height: themeConfig.particleClass === 'matrix-column' ? 'auto' : asset.size,
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
    </div>
  );
}
