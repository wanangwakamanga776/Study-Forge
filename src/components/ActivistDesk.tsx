import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, ChevronRight, Pin, Calendar, User, Tag, ArrowRight, Play, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { subscribeAnnouncements } from '../services/dataService';
import { Announcement } from '../types';

export const ActivistDesk: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((data) => {
      setAnnouncements(data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      }));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="w-full h-80 flex flex-col items-center justify-center space-y-4 glass-card rounded-[3rem] border border-white/5 opacity-40">
       <div className="w-10 h-10 border-2 border-white/10 border-t-forge-accent rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Receiving Transmissions</p>
    </div>
  );

  if (announcements.length === 0) return null;

  const current = announcements[activeIdx];

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-forge-accent/20 text-forge-accent rounded-xl">
                <Newspaper size={20} />
            </div>
            <div>
                <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Activist Desk</h2>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Global Broadcast Matrix</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {announcements.map((_, i) => (
                <button
                    key={i}
                    onClick={() => { setActiveIdx(i); soundService.playClick(); }}
                    className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === activeIdx ? "bg-forge-accent w-6" : "bg-white/10 hover:bg-white/20"
                    )}
                />
            ))}
        </div>
      </div>

      <div className="relative group">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -20 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel overflow-hidden rounded-[3.5rem] border border-white/10 relative min-h-[500px] flex flex-col shadow-2xl"
          >
            {/* Background Image / Blur */}
            <div className="absolute inset-0 z-0">
               {current.mediaUrl ? (
                 <>
                   <img 
                    src={current.mediaUrl} 
                    alt="" 
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-forge-dark via-forge-dark/60 to-transparent" />
                 </>
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-forge-dark via-orange-950/20 to-forge-dark" />
               )}
            </div>

            <div className="relative z-10 flex-1 p-10 md:p-16 flex flex-col justify-end">
                <div className="space-y-6 max-w-4xl">
                   <div className="flex flex-wrap items-center gap-4">
                      {current.isPinned && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-forge-accent text-forge-dark rounded-full text-[10px] font-black uppercase tracking-widest">
                           <Pin size={12} />
                           Pinned
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                         <Tag size={12} className="text-forge-accent" />
                         {current.category || 'Announcement'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">
                         <Calendar size={12} />
                         {new Date(current.createdAt).toLocaleDateString()}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <p className="text-forge-accent text-lg font-black uppercase italic tracking-tighter opacity-80">{current.subheading}</p>
                      <h3 className="text-5xl md:text-7xl font-display font-black uppercase italic tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
                         {current.title}
                      </h3>
                   </div>

                   <p className="text-white/60 text-lg md:text-xl font-medium italic leading-relaxed line-clamp-3">
                      {current.content}
                   </p>

                   <div className="flex flex-wrap items-center gap-6 pt-8">
                      <button 
                        onClick={() => soundService.playClick()}
                        className="group flex items-center gap-3 px-8 py-3.5 bg-white text-forge-dark rounded-2xl font-display font-black uppercase italic tracking-tighter hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)] transition-all"
                      >
                         Read Full Broadcast
                         <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <div className="flex items-center gap-3 px-1 text-white/30">
                         <div className="w-8 h-8 rounded-full bg-forge-accent/20 border border-forge-accent/30 flex items-center justify-center text-forge-accent">
                            <User size={14} />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest">{current.authorName || 'Archivist'}</span>
                      </div>
                   </div>
                </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
            onClick={() => { setActiveIdx(prev => (prev - 1 + announcements.length) % announcements.length); soundService.playClick(); }}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 border border-white/5"
        >
            <ChevronRight size={24} className="rotate-180" />
        </button>
        <button 
            onClick={() => { setActiveIdx(prev => (prev + 1) % announcements.length); soundService.playClick(); }}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 border border-white/5"
        >
            <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};
