import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  LogOut, 
  ChevronDown, 
  Flame, 
  ShieldCheck, 
  UserCircle,
  Camera,
  Loader2,
  CloudCheck,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { useAuth, logout } from '../services/authService';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { useAppState } from '../hooks/useAppState';
import { soundService } from '../services/soundService';
import { uploadAvatar } from '../services/profileService';

interface ProfileHeaderProps {
  onOpenSettings: () => void;
}

export function ProfileHeader({ onOpenSettings }: ProfileHeaderProps) {
  const { user } = useAuth();
  const { isSyncing, syncError } = useAppState();
  const { xp, level, embers, currentTheme, unlockedThemes } = useForgeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const levelProgress = (xp % 1000) / 10;

  const toggleMenu = () => {
    soundService.playClick();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadAvatar(file);
      soundService.playProcess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={toggleMenu}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.08] rounded-full pl-2 pr-5 py-2 backdrop-blur-2xl hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_0_25px_rgba(255,255,255,0.05)] transition-all duration-300 group"
      >
        {/* Avatar Ring with Dynamic Theme Glow & Metallic Frame */}
        <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-br from-forge-accent via-stone-200 to-orange-500 shadow-[inset_0_0_2px_rgba(255,255,255,0.8),0_0_20px_rgba(251,146,60,0.4)] shrink-0 group/avatar overflow-hidden">
          <div className="w-full h-full rounded-full p-0.5 bg-forge-dark overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-forge-accent/30 to-transparent animate-pulse" />
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Student'} 
                className="w-full h-full rounded-full object-cover relative z-10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-forge-dark flex items-center justify-center relative z-10">
                <UserCircle size={24} className="text-stone-600" />
              </div>
            )}
          </div>
          
          {/* Overlay for quick upload */}
          <div 
            onClick={handleAvatarClick}
            className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin text-white" /> : <Camera size={16} className="text-white" />}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="sr-only" 
            accept="image/*" 
            onChange={handleFileChange} 
            onClick={(e) => { (e.target as any).value = null; }}
          />
        </div>

        <div className="text-left pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-display font-black uppercase italic tracking-tighter text-white truncate max-w-[120px]">
              {user.displayName || 'Student'}
            </span>
            <div className="px-1.5 py-0.5 bg-forge-accent/10 border border-forge-accent/20 rounded-md text-[8px] font-black text-forge-accent uppercase tracking-widest">
              Level {level}
            </div>
            
            {/* Cloud Sync Icon */}
            <div className="ml-1">
              {isSyncing ? (
                <RefreshCw size={12} className="text-forge-accent animate-spin" />
              ) : syncError ? (
                <CloudOff size={12} className="text-red-500" />
              ) : (
                <CloudCheck size={12} className="text-green-500 animate-pulse" />
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-forge-accent shadow-[0_0_10px_rgba(251,146,60,0.8)]" 
              />
            </div>
            <div className="flex items-center gap-2 text-stone-300">
              <div className="relative">
                <Flame size={12} className="text-forge-accent relative z-10" />
                <div className="absolute inset-0 bg-forge-accent blur-md opacity-60 animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-none drop-shadow-md">{embers} Embers</span>
            </div>
          </div>
        </div>

        <ChevronDown 
          size={16} 
          className={`text-stone-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>

      {/* Quick Access Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsMenuOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-56 bg-forge-dark border border-white/10 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl"
            >
              <div className="px-3 py-3 border-b border-white/5 mb-2">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] mb-1">Signed in as</p>
                <p className="text-xs font-bold text-white truncate">{user.email}</p>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
                >
                  <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    soundService.playClick();
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                >
                  <LogOut size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
