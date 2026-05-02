import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Hammer, Sparkles, Flame, Trophy, Layers, Upload, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { PyraMascot } from './PyraMascot';

const STEPS = [
  {
    title: "1. Upload Curriculum",
    content: "Upload PDFs, documents, or paste notes into our system. Our Academic AI parses your materials to identify key concepts, complex formulas, and core themes.",
    icon: <Upload className="text-forge-accent" size={48} />,
    mascotLine: "I'm Pyra! Let's start by feeding me some study notes!"
  },
  {
    title: "2. Create Study Lessons",
    content: "Generate cinematic 'StudyCasts'—interactive educational videos that break down complex topics into 5 logical scenes with detailed visuals and clear explanations.",
    icon: <Sparkles className="text-forge-accent" size={48} />,
    mascotLine: "Check out StudyCasts. They're like magic movies for learning!"
  },
  {
    title: "3. Dynamic Planner",
    content: "Organize your academic life with our Todoist-style planner. Use P1-P4 priority flags and professional sections to keep your schedule fully synchronized.",
    icon: <Zap className="text-forge-accent" size={48} />,
    mascotLine: "Organization is key. I'll help you keep track of every deadline!"
  },
  {
    title: "4. Active Recall Tools",
    content: "Automatically generate Flashcards and Quizzes from your notes. Practice 'Velocity Match' mode to build speed and reinforce your long-term memory.",
    icon: <Layers className="text-forge-accent" size={48} />,
    mascotLine: "Active recall is the secret sauce. Let's forge those neurons!"
  },
  {
    title: "5. Focus Sessions",
    content: "Enter 'Focus Mode' (Timer) to eliminate distractions. Every productive session earns you XP and Embers to level up your Academic Profile.",
    icon: <Flame className="text-forge-accent" size={48} />,
    mascotLine: "Concentrate deeply, and we'll both get much stronger!"
  },
  {
    title: "6. Academy Elite",
    content: "Track your growth against students globally in the Archives. Reach the top of the Hall of Fame by maintaining study streaks and mastering more subjects.",
    icon: <Trophy className="text-forge-accent" size={48} />,
    mascotLine: "Ready to become an Elite scholar? Let's go!"
  }
];

export function ForgeTutorial({ onClose, isAdmin }: { onClose: () => void, isAdmin?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
      soundService.playClick();
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      soundService.playClick();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          "max-w-4xl w-full grid grid-cols-1 bg-forge-dark border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-500",
          isAdmin ? "md:grid-cols-[300px_1fr]" : "max-w-md"
        )}
      >
        {/* Mascot Sidebar (Admin Only) */}
        {isAdmin && (
          <div className="hidden md:flex flex-col items-center justify-center p-12 bg-white/[0.02] border-r border-white/5">
             <PyraMascot 
               expression="tutorial" 
               message={STEPS[currentStep].mascotLine} 
               className="scale-110"
             />
          </div>
        )}

        <div className="flex flex-col relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-forge-accent/10 blur-[100px] -z-10" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-stone-500 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="p-12 text-center flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="flex flex-col items-center"
                    >
                        {isAdmin && (
                          <div className="md:hidden mb-8">
                               <PyraMascot expression="tutorial" message={STEPS[currentStep].mascotLine} />
                          </div>
                        )}
                        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/5">
                            {STEPS[currentStep].icon}
                        </div>
                        <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white mb-4">
                            {STEPS[currentStep].title}
                        </h3>
                        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed max-w-[320px] mx-auto">
                            {STEPS[currentStep].content}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                    {STEPS.map((_, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                currentStep === i ? "bg-forge-accent w-6" : "bg-white/10"
                            )}
                        />
                    ))}
                </div>
                
                <div className="flex items-center gap-3">
                    {currentStep > 0 && (
                        <button 
                            onClick={prev}
                            className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <button 
                      onClick={next}
                      className="px-6 py-3 bg-forge-accent text-forge-dark rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform forge-glow"
                    >
                      {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                      <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}

