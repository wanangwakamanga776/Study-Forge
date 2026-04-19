import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  User, 
  Bell, 
  Volume2, 
  Shield, 
  LogOut, 
  Save, 
  Loader2,
  Hammer,
  Check
} from 'lucide-react';
import { useAuth, logout } from '../services/authService';
import { uploadAvatar, updateDisplayName } from '../services/profileService';
import { soundService } from '../services/soundService';
import { useForgeStore } from '../contexts/ForgeStoreContext';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettings({ isOpen, onClose }: AccountSettingsProps) {
  const { user } = useAuth();
  const { level } = useForgeStore();
  
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    soundService.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadAvatar(file);
      soundService.playLevelUp(); // Use levelup sound for success
    } catch (error) {
      console.error(error);
      alert("Failed to smelt avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!newName.trim()) return;
    
    setIsSaving(true);
    soundService.playClick();
    try {
      await updateDisplayName(newName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-2xl w-full bg-forge-dark border border-white/5 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-forge-accent/50 to-transparent" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-10 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-forge-accent/10 rounded-2xl border border-forge-accent/20">
              <Hammer className="text-forge-accent" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Account Forge</h2>
              <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">Refine your apprentice profile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-full transition-colors text-stone-500 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* Sidebar Tabs (Conceptual for now, can be expanded) */}
          <div className="w-full md:w-64 border-r border-white/5 p-6 space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-forge-accent/10 text-forge-accent rounded-xl border border-forge-accent/20">
              <User size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:text-white transition-colors cursor-not-allowed">
              <Volume2 size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Preferences</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-stone-600 hover:text-white transition-colors cursor-not-allowed">
              <Bell size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Notifications</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-10 space-y-12 metallic-scrollbar">
            
            {/* Avatar Section */}
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Master Avatar</h3>
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-forge-accent/30 forge-glow relative">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <User size={48} className="text-stone-700" />
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-forge-dark/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-forge-accent" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleAvatarClick}
                    className="absolute -bottom-2 -right-2 p-3 bg-white text-forge-dark rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all group-hover:rotate-6"
                    disabled={isUploading}
                  >
                    <Camera size={18} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white">Custom Smelting</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest leading-relaxed">
                    Upload a portrait for your<br/>Master Smith to recognize you.<br/>Max size: 2MB (PNG/JPG)
                  </p>
                </div>
              </div>
            </section>

            {/* Display Name Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Apprentice Title</h3>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter new name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:outline-none focus:border-forge-accent/50 transition-colors"
                  />
                  {saveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-green-500 text-[10px] font-black uppercase"
                    >
                      <Check size={14} />
                      Forged
                    </motion.div>
                  )}
                </div>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving || !newName.trim() || newName === user?.displayName}
                  className="px-8 py-4 bg-forge-accent text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                </button>
              </div>
            </section>

            {/* Account Management */}
            <section className="pt-8 border-t border-white/5">
              <button
                onClick={() => {
                  soundService.playClick();
                  logout();
                  onClose();
                }}
                className="flex items-center gap-3 px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-display font-black uppercase italic tracking-tighter hover:bg-red-500 hover:text-white transition-all w-full justify-center group"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                Extinguish Hearth (Log Out)
              </button>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
