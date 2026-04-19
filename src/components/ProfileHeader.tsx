import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  LogOut, 
  ChevronDown, 
  Flame, 
  ShieldCheck, 
  UserCircle 
} from 'lucide-react';
import { useAuth, logout } from '../services/authService';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';

interface ProfileHeaderProps {
  onOpenSettings: () => void;
}

export function ProfileHeader({ onOpenSettings }: ProfileHeaderProps) {
  const { user } = useAuth();
  const { level, embers, currentTheme } = useForgeStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    soundService.playClick();
    setIsMenuOpen(!isMenuOpen);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={toggleMenu}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full pl-2 pr-5 py-2 backdrop-blur-md hover:bg-white/10 transition-all group"
      >
        {/* Avatar Ring with Dynamic Theme Glow */}
        <div className="relative w-10 h-10 rounded-full p-0.5 forge-glow border border-forge-accent/30 overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-forge-accent/20 to-transparent animate-pulse" />
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'Apprentice'} 
              className="w-full h-full rounded-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-forge-dark flex items-center justify-center relative z-10">
              <UserCircle size={24} className="text-stone-600" />
            </div>
          )}
        </div>

        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-black uppercase italic tracking-tighter text-white truncate max-w-[120px]">
              {user.displayName || 'Apprentice'}
            </span>
            <div className="px-1.5 py-0.5 bg-forge-accent/10 border border-forge-accent/20 rounded-md text-[8px] font-black text-forge-accent uppercase tracking-widest">
              Lvl {level}
            </div>
          </div>
          <div className="flex items-center gap-2 text-stone-500">
            <Flame size={10} className="text-forge-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{embers} Embers</span>
          </div>
        </div>

        <ChevronDown 
          size={16} 
          className={Object.assign({}, { 
            className: `text-stone-600 transition-transform ${isMenuOpen ? 'rotate-180' : ''}` 
          }).className} 
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
                  <span className="text-[10px] font-black uppercase tracking-widest">Account Forge</span>
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
                  <span className="text-[10px] font-black uppercase tracking-widest">Extinguish Hearth</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
