import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Image as ImageIcon, Heart, Send, Sparkles, HelpCircle, X } from 'lucide-react';
import { subscribeAboutMe, AboutMeData } from '../services/dataService';
import { cn } from '../lib/utils';
import { ActivistDesk } from './ActivistDesk';

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
             <h2 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-black mb-4">
              The Archivist's Desk
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.4em] text-stone-900">
              <span className="w-8 h-px bg-stone-900" />
              Official Project Transmission
              <span className="w-8 h-px bg-stone-900" />
            </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-8 md:p-16 lg:p-20 shadow-2xl shadow-stone-200/40 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 text-stone-900/5 pointer-events-none">
            <User size={400} strokeWidth={1} />
          </div>
          
          <div className="relative z-10">
            <div className="grid lg:grid-cols-[1.5fr,1fr] gap-16 lg:gap-24 items-start">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-black rounded-full mb-4">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Master Authority Verified</span>
                </div>

                <div className="flex flex-col items-center justify-center py-6">
                    <ActivistDesk />
                </div>

                <div className="flex flex-wrap items-center gap-8 pt-10 border-t border-stone-100 opacity-60 grayscale pointer-events-none">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-stone-100 flex items-center justify-center text-xs font-black text-stone-900 shadow-sm relative group overflow-hidden">
                          <div className="absolute inset-0 bg-stone-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          <span className="relative z-10">{String.fromCharCode(64 + i)}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Founding Members</p>
                       <p className="text-[10px] font-bold text-stone-900">Join the Forge Elite</p>
                    </div>
                  </div>

                  <div className="h-10 w-px bg-stone-100 hidden md:block" />

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                      <Send size={18} />
                    </div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Get in Touch</p>
                       <p className="text-[10px] font-bold text-stone-900">wanangwakamanga360@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 lg:sticky lg:top-24 opacity-40 grayscale pointer-events-none">
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
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <ImageIcon size={32} className="text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-square bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-12 text-center text-stone-500">
                    <ImageIcon size={48} strokeWidth={1} className="mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-loose">
                      Visual Archive Empty<br/>
                      <span className="text-[8px] font-normal italic">Add assets in Admin Panel</span>
                    </p>
                  </div>
                )}
                
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100 text-center">
                   <Heart size={20} className="mx-auto mb-3 text-red-500 fill-red-500 animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-900">
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

  useEffect(() => {
    const openMission = () => setIsOpen(true);
    window.addEventListener('studyforge:open-mission', openMission);
    return () => window.removeEventListener('studyforge:open-mission', openMission);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              className="sf-card relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mission-title"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-lg text-[var(--sf-text-subtle)] transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Close mission"
              >
                <X size={18} />
              </button>

              <div className="flex-1 overflow-y-auto metallic-scrollbar p-6 sm:p-9">
                <div className="mb-7 flex items-center gap-3.5">
                  <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]">
                     <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 id="mission-title" className="text-[22px] font-semibold text-white" style={{ fontFamily: 'var(--sf-font-display)' }}>My Story</h2>
                    <p className="sf-eyebrow mt-1">Official project mission</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="whitespace-pre-line text-[14.5px] leading-7 text-[var(--sf-text-muted)]">
                    {data?.message || `Hi, I’m Wana, a 16 year-old student in 10th grade. While studying for tests I realized that the tools we use to study are either too expensive or just don't work the way we actually learn.

The Mission: Why Study Forge?

I built Study Forge because I was tired of hitting paywalls for basic study features. I wanted to create a 'Student OS' that focuses on actual understanding, not just memorization.

Using Google AI Studio, I developed the Academic Assistant to act as a tutor guiding you through concepts in Chemistry or Geometry rather than just handing over the answers. My goal is to help us all keep high grades and understand essential concepts while still having time for a life outside of school.

Study Forge is currently in its Update 2.0 stage. As a student developer, I’m constantly shipping updates, fixing bugs, and adding new features like the Embers Shop and Community Vault.

By using the app now, you are a founding member. Your feedback directly shapes how this tool grows.`}
                  </p>
                  
                  {data?.images && data.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {data.images.map((url, idx) => (
                        <div key={idx} className="aspect-square overflow-hidden rounded-[14px] border border-[var(--sf-border)] group">
                           <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-[14px] border border-[var(--sf-border)] bg-white/[0.025] p-5">
                    <div className="mb-2.5 flex items-center gap-2">
                      <Heart size={15} className="text-[var(--sf-orange-400)]" />
                      <span className="sf-eyebrow">Student developer mission</span>
                    </div>
                    <p className="text-[13px] leading-6 text-[var(--sf-text-subtle)]">
                      Study Forge is a living project. Updates and fixes ship continuously, and your presence as a founding member is invaluable.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--sf-border)] bg-white/[0.02] px-6 py-4">
                <div className="text-[11px] text-[var(--sf-text-disabled)]">
                  Built by a student, for students.
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="sf-btn sf-btn-primary min-h-9 px-4 text-[12.5px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
