import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Terminal, X, Zap, Flame, Check, MessageSquare, Image as ImageIcon, Save, Megaphone, Trash2, Pin, User, Plus, LayoutDashboard, Archive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { soundService } from '../services/soundService';
import { subscribeAboutMe, updateAboutMe, AboutMeData, publishAnnouncement, subscribeAnnouncements, deleteAnnouncement, subscribeFeedback, updateFeedbackStatus, getGlobalAnnouncement, updateGlobalAnnouncement } from '../services/dataService';
import { useAuthContext } from '../contexts/AuthContext';
import { Announcement, Feedback } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSetMaxLevel: (active: boolean) => void;
  onSetUnlimitedCurrency: (active: boolean) => void;
  currentXp: number;
  currentEmbers: number;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, onClose, onSetMaxLevel, onSetUnlimitedCurrency, currentXp, currentEmbers
}) => {
  const { user } = useAuthContext();
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'cheats' | 'aboutme' | 'activist' | 'feedback' | 'announcement'>('cheats');
  const isMaxLevel = currentXp >= 1000000;
  const isUnlimitedEmbers = currentEmbers >= 1000000;

  const [aboutMeMessage, setAboutMeMessage] = useState('');
  const [aboutMeImages, setAboutMeImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [announcement, setAnnouncement] = useState({ message: '', active: false });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      getGlobalAnnouncement().then(data => data && setAnnouncement(data));
      const unsubAbout = subscribeAboutMe((data) => {
        if (data && !isSaving) {
          setAboutMeMessage(data.message);
          setAboutMeImages(data.images);
        }
      });
      const unsubAnnounce = subscribeAnnouncements((data) => setAnnouncements(data));
      const unsubFeedback = subscribeFeedback((data) => setFeedbacks(data));
      return () => { unsubAbout(); unsubAnnounce(); unsubFeedback(); };
    }
  }, [isUnlocked, isSaving]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', subheading: '', content: '', mediaUrl: '', category: 'Updates', isPinned: false });
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'resolved' | 'archived'>('all');

  const handleSaveAboutMe = async () => {
    setIsSaving(true);
    soundService.playClick();
    try { await updateAboutMe({ message: aboutMeMessage, images: aboutMeImages }); soundService.playSuccess(); } 
    catch (e) { soundService.playError(); } finally { setIsSaving(false); }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;
    setIsSaving(true);
    soundService.playClick();
    try {
      await publishAnnouncement({ ...newPost, id: generateId(), createdAt: Date.now(), authorName: user?.displayName || 'Archivist', authorId: user?.uid || 'admin' });
      soundService.playSuccess();
      setNewPost({ title: '', subheading: '', content: '', mediaUrl: '', category: 'Updates', isPinned: false });
      setShowCreator(false);
    } catch (e) { soundService.playError(); } finally { setIsSaving(false); }
  };

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    soundService.playClick();
    try { await updateGlobalAnnouncement(announcement.message, announcement.active); soundService.playSuccess(); }
    catch (e) { soundService.playError(); } finally { setIsSavingAnnouncement(false); }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'StudyForgeAdmin') { setIsUnlocked(true); setError(false); soundService.playSuccess(); } 
    else { setError(true); soundService.playError(); setTimeout(() => setError(false), 500); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-5xl h-[85vh] bg-forge-dark border border-white/10 rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-forge-accent/20 text-forge-accent rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield size={24} />
                </div>
                <div>
                   <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Activist Control</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Forge Protocol Authority Level 4</p>
                </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl text-stone-500 hover:text-white transition-all hover:bg-white/10">
                <X size={24} />
            </button>
        </div>

        {!isUnlocked ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <form onSubmit={handleUnlock} className="w-full max-w-md space-y-8">
              <div className="text-center space-y-2 mb-10">
                 <Lock size={48} className="mx-auto text-stone-700 mb-4" />
                 <h3 className="text-xl font-display font-black uppercase italic text-white">Identity Verification Required</h3>
                 <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Enter the Master Root Passcode</p>
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <Terminal className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 transition-colors",
                    error ? "text-red-500" : "text-stone-600 group-focus-within:text-forge-accent"
                  )} size={20} />
                  <input
                    autoFocus
                    type="password"
                    placeholder="Enter Root Passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className={cn(
                      "w-full h-16 bg-white/[0.03] border rounded-[1.5rem] pl-14 pr-6 text-white text-lg font-bold outline-none transition-all",
                      error ? "border-red-500 ring-4 ring-red-500/10" : "border-white/5 focus:border-forge-accent focus:ring-4 focus:ring-forge-accent/10"
                    )}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-white text-forge-dark rounded-2xl font-display font-black uppercase italic tracking-tighter text-lg hover:shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all"
                >
                  Verify Access
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
             {/* Tabs */}
             <div className="flex gap-4 p-8 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'cheats', label: 'Cheats', icon: <Terminal size={18} /> },
                  { id: 'activist', label: 'Activist Desk', icon: <Megaphone size={18} /> },
                  { id: 'feedback', label: 'User Feedback', icon: <MessageSquare size={18} /> },
                  { id: 'aboutme', label: 'About Me', icon: <User size={18} /> },
                  { id: 'announcement', label: 'Announcement', icon: <AlertTriangle size={18} /> },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shrink-0",
                      activeTab === tab.id ? "bg-forge-accent text-forge-dark shadow-xl" : "bg-white/5 text-stone-500 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-8 pt-0 metallic-scrollbar">
                {activeTab === 'cheats' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                     <button
                        onClick={() => onSetMaxLevel(!isMaxLevel)}
                        className={cn(
                            "group p-10 rounded-[3rem] border transition-all text-left relative overflow-hidden",
                            isMaxLevel ? "bg-forge-accent text-forge-dark border-transparent" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-8">
                           <div className={cn("p-4 rounded-2xl", isMaxLevel ? "bg-forge-dark/20" : "bg-white/5 text-forge-accent")}>
                              <Zap size={32} />
                           </div>
                           <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", isMaxLevel ? "bg-forge-dark/10" : "bg-white/5")}>
                              {isMaxLevel ? 'PROTOCOL ACTIVE' : 'LOCKED'}
                           </div>
                        </div>
                        <h4 className="text-2xl font-display font-black uppercase italic tracking-tighter mb-2">Max Synergy</h4>
                        <p className={cn("text-xs font-bold uppercase tracking-widest opacity-60", isMaxLevel ? "" : "text-stone-500")}>Instant Ascension to Level 100</p>
                      </button>

                      <button
                        onClick={() => onSetUnlimitedCurrency(!isUnlimitedEmbers)}
                        className={cn(
                            "group p-10 rounded-[3rem] border transition-all text-left relative overflow-hidden",
                            isUnlimitedEmbers ? "bg-orange-500 text-white border-transparent" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-8">
                           <div className={cn("p-4 rounded-2xl", isUnlimitedEmbers ? "bg-white/20" : "bg-white/5 text-orange-500")}>
                              <Flame size={32} />
                           </div>
                           <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", isUnlimitedEmbers ? "bg-white/10" : "bg-white/5")}>
                              {isUnlimitedEmbers ? 'SYNERGY HIGH' : 'STABLE'}
                           </div>
                        </div>
                        <h4 className="text-2xl font-display font-black uppercase italic tracking-tighter mb-2">Infinite Embers</h4>
                        <p className={cn("text-xs font-bold uppercase tracking-widest opacity-60", isUnlimitedEmbers ? "" : "text-stone-500")}>Unlimited Shop Purchasing Power</p>
                      </button>
                  </div>
                )}
                {activeTab === 'feedback' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {feedbacks.map(f => (
                      <div key={f.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-white font-bold">{f.title}</h4>
                          <span className="text-xs text-stone-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-stone-300 text-sm mb-4">{f.message}</p>
                        <div className="flex gap-2">
                           <button onClick={() => updateFeedbackStatus(f.id, 'resolved')} className="px-4 py-2 bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest">Mark Resolved</button>
                           <button onClick={() => updateFeedbackStatus(f.id, 'archived')} className="px-4 py-2 bg-stone-500/20 text-stone-500 rounded-lg text-xs font-bold uppercase tracking-widest">Archive</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'aboutme' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">About Me Message</label>
                      <textarea 
                          rows={6}
                          value={aboutMeMessage}
                          onChange={(e) => setAboutMeMessage(e.target.value)}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-forge-accent/50 transition-all"
                      />
                      <button
                          onClick={handleSaveAboutMe}
                          disabled={isSaving}
                          className="px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-bold uppercase tracking-widest hover:scale-105 transition-all"
                      >
                          {isSaving ? 'Saving...' : 'Publish About Me'}
                      </button>
                  </div>
                )}
                {activeTab === 'activist' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Activist Desk Content</label>
                      <input
                          type="text"
                          placeholder="Title"
                          value={newPost.title}
                          onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-forge-accent/50 transition-all"
                      />
                      <textarea 
                          rows={6}
                          placeholder="Content"
                          value={newPost.content}
                          onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-forge-accent/50 transition-all"
                      />
                      <button
                          onClick={handleCreateAnnouncement}
                          disabled={isSaving}
                          className="px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-bold uppercase tracking-widest hover:scale-105 transition-all"
                      >
                          {isSaving ? 'Publishing...' : 'Publish to Activist Desk'}
                      </button>
                  </div>
                )}
                {activeTab === 'announcement' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Global Announcement</label>
                      <textarea 
                          rows={4}
                          value={announcement.message}
                          onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium outline-none focus:border-forge-accent/50 transition-all"
                      />
                      <div className="flex items-center justify-between">
                          <button 
                              onClick={() => setAnnouncement({...announcement, active: !announcement.active})}
                              className={cn("px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest", announcement.active ? "bg-emerald-500 text-white" : "bg-white/5 text-stone-500")}
                          >
                              {announcement.active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                              onClick={handleSaveAnnouncement}
                              disabled={isSavingAnnouncement}
                              className="px-8 py-3 bg-white text-forge-dark rounded-xl font-bold uppercase tracking-widest hover:scale-105 transition-all"
                          >
                              {isSavingAnnouncement ? 'Saving...' : 'Save Announcement'}
                          </button>
                      </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
