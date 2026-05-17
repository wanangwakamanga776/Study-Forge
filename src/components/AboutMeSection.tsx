import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Image as ImageIcon, Heart, Send, Sparkles, HelpCircle, X } from 'lucide-react';
import { subscribeAboutMe, AboutMeData } from '../services/dataService';
import { cn } from '../lib/utils';

export function AboutMeSection() {
  const [data, setData] = useState<AboutMeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAboutMe((res) => {
      setData(res);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="w-full py-20 flex flex-col items-center justify-center opacity-20">
      <div className="w-12 h-12 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.section
      id="about-me-section"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="w-full py-24 border-t border-stone-200/50 bg-stone-50/50 relative overflow-hidden"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center mb-16 text-center">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-stone-300 mb-8" />
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-stone-900 mb-4">
              The Archivist's Desk
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.4em] text-stone-400">
              <span className="w-8 h-px bg-stone-300" />
              Official Project Transmission
              <span className="w-8 h-px bg-stone-300" />
            </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-[3rem] p-8 md:p-16 lg:p-20 shadow-2xl shadow-stone-200/40 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 text-stone-50/50 pointer-events-none">
            <User size={400} strokeWidth={1} />
          </div>
          
          <div className="relative z-10">
            <div className="grid lg:grid-cols-[1.5fr,1fr] gap-16 lg:gap-24 items-start">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-forge-accent/10 text-forge-accent rounded-full mb-4">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Master Authority Verified</span>
                </div>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="space-y-4">
                    <p className="text-5xl md:text-7xl font-display font-black tracking-[0.3em] uppercase italic text-stone-100 select-none">
                      COMING SOON
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-1.5 h-1.5 bg-forge-accent rounded-full animate-ping" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-300">Archive Expansion in Progress</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-8 pt-10 border-t border-stone-100 opacity-20 grayscale pointer-events-none">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-stone-100 flex items-center justify-center text-xs font-black text-stone-400 shadow-sm relative group overflow-hidden">
                          <div className="absolute inset-0 bg-forge-accent/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          <span className="relative z-10">{String.fromCharCode(64 + i)}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-900">Founding Members</p>
                       <p className="text-[10px] font-bold text-stone-400">Join the Forge Elite</p>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-stone-100 hidden md:block" />

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center">
                      <Send size={18} />
                    </div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-900">Get in Touch</p>
                       <p className="text-[10px] font-bold text-stone-400">Feedback Loop: Open</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 lg:sticky lg:top-24 opacity-10 grayscale pointer-events-none">
                {false && data?.images && data.images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {data.images.map((url, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={cn(
                          "aspect-video md:aspect-square rounded-[2rem] overflow-hidden border-8 border-white shadow-xl bg-stone-100 relative group",
                          idx % 2 === 1 ? "lg:translate-x-6" : "lg:-translate-x-6"
                        )}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <ImageIcon size={32} className="text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-square bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-12 text-center text-stone-300">
                    <ImageIcon size={48} strokeWidth={1} className="mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-loose">
                      Visual Archive Empty<br/>
                      <span className="text-[8px] font-normal italic">Add assets in Admin Panel</span>
                    </p>
                  </div>
                )}
                
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100 text-center">
                   <Heart size={20} className="mx-auto mb-3 text-red-500 fill-red-500 animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                     Built for students,<br/>by a student.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function AboutMePopup() {
  const [data, setData] = useState<AboutMeData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAboutMe(setData);
    return () => unsubscribe();
  }, []);

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-6 w-16 h-16 bg-stone-900 text-white rounded-full shadow-[0_0_40px_rgba(0,0,0,0.4)] flex items-center justify-center z-[10000] border-4 border-white group"
      >
        <HelpCircle size={28} className="group-hover:scale-110 transition-transform" />
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-6 h-6 bg-forge-accent rounded-full blur-sm" 
            />
            <div className="relative w-4 h-4 bg-forge-accent rounded-full border-2 border-white flex items-center justify-center">
               <div className="w-1 h-1 bg-white rounded-full animate-ping" />
            </div>
        </div>
        
        {/* Tooltip on hover */}
        <div className="absolute right-full mr-4 px-3 py-1 bg-stone-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
          The Mission
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-stone-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl max-h-[85vh] bg-white rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-stone-100 hover:bg-stone-200 rounded-2xl flex items-center justify-center text-stone-500 transition-colors z-20"
              >
                <X size={20} />
              </button>

              <div className="flex-1 overflow-y-auto metallic-scrollbar p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-stone-900 text-white rounded-3xl">
                     <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-stone-900 leading-none">My Story</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mt-1">Official Project Mission</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="prose prose-stone max-w-none">
                    <div className="text-lg md:text-xl text-stone-700 leading-relaxed font-serif italic whitespace-pre-line">
                      {data?.message || `Hi, I’m Wana, I’m a 16 year-old student currently in 10th-grade. While studying for tests I realized that the tools we use to study are either too expensive or just don't work the way we actually learn.

The Mission: Why Study Forge?

I built Study Forge because I was tired of hitting paywalls for basic study features. I wanted to create a 'Student OS' (operating system) that focuses on actual understanding, not just memorization.

Using Google AI Studio, I developed the Academic Assistant to act as a tutor guiding you through concepts in Chemistry or Geometry rather than just handing over the answers. My goal is to help us all maintain high grades and understanding essential concepts while actually having time for a life outside of school.

Please keep in mind that Study Forge is currently in its <span className="font-black text-emerald-500">Update 2.0</span> stage. As a student developer, I’m constantly shipping updates, fixing bugs, and adding new features like the Embers Shop and Community Vault.

By using the app now, you are a "Founding Member." Your feedback directly shapes how this tool grows. If you find a bug or have a feature request, let me know—I’m building this for us.`}
                    </div>
                  </div>
                  
                  {data?.images && data.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                      {data.images.map((url, idx) => (
                        <div key={idx} className="aspect-square rounded-3xl overflow-hidden border-4 border-stone-50 group">
                           <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-stone-50 rounded-[2rem] p-6 border border-stone-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Heart size={16} className="text-red-500 fill-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-900">Student Developer Mission</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Study Forge is a living project. We are constantly shipping updates and fixing bugs together. Your presence as a founding member is invaluable.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                  Alpha v0.8.2 // Protocol Active
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 bg-stone-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  Close Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
