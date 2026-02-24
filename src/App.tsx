/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Timer, ListTodo, Layers, BrainCircuit, Menu, X, Star, Sparkles } from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { Dashboard } from './components/Dashboard';
import { TaskPlanner } from './components/TaskPlanner';
import { FocusTimer } from './components/FocusTimer';
import { Flashcards } from './components/Flashcards';
import { QuizMode } from './components/QuizMode';
import { PremiumModal } from './components/PremiumModal';
import { AIGenerator } from './components/AIGenerator';
import { cn } from './lib/utils';
import { Deck, Quiz } from './types';

type View = 'dashboard' | 'planner' | 'timer' | 'flashcards' | 'quiz';

export default function App() {
  const { state, setState, updateStats } = useAppState();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  if (!state || !state.stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const handleUpgrade = (plan: 'Premium') => {
    setState(prev => ({
      ...prev,
      stats: { ...prev.stats, plan }
    }));
    setIsPremiumModalOpen(false);
  };

  const handleAIGenerated = (type: 'flashcards' | 'quiz', data: any) => {
    setState(prev => {
      const newState = { ...prev };
      if (type === 'flashcards') {
        newState.decks = [...prev.decks, data as Deck];
        newState.stats.aiUsage.flashcards += 1;
      } else {
        newState.quizzes = [...prev.quizzes, data as Quiz];
        newState.stats.aiUsage.quizzes += 1;
      }
      return newState;
    });
    updateStats(50); // Bonus XP for AI generation
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layout size={20} /> },
    { id: 'planner', label: 'Planner', icon: <ListTodo size={20} /> },
    { id: 'timer', label: 'Focus Timer', icon: <Timer size={20} /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers size={20} /> },
    { id: 'quiz', label: 'Quiz Mode', icon: <BrainCircuit size={20} /> },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            state={state} 
            onNavigate={(v) => setCurrentView(v as View)} 
            onGenerated={handleAIGenerated}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
          />
        );
      case 'planner':
        return (
          <TaskPlanner 
            tasks={state.tasks} 
            onUpdate={(tasks) => setState(prev => ({ ...prev, tasks }))}
            onComplete={updateStats}
          />
        );
      case 'timer':
        return <FocusTimer onComplete={updateStats} />;
      case 'flashcards':
        return (
          <Flashcards 
            decks={state.decks} 
            onUpdate={(decks) => setState(prev => ({ ...prev, decks }))}
          />
        );
      case 'quiz':
        return (
          <QuizMode 
            quizzes={state.quizzes} 
            onUpdate={(quizzes) => setState(prev => ({ ...prev, quizzes }))}
            onComplete={updateStats}
          />
        );
      default:
        return (
          <Dashboard 
            state={state} 
            onNavigate={(v) => setCurrentView(v as View)} 
            onGenerated={handleAIGenerated}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onUpgrade={handleUpgrade}
      />

      {/* Sidebar / Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-forge-dark border-r border-white/5 transition-transform lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-forge-accent rounded-xl flex items-center justify-center text-forge-dark forge-glow">
                <BrainCircuit size={24} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tighter font-display text-white uppercase italic">Study Forge</h1>
            </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as View);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all",
                  currentView === item.id 
                    ? "bg-forge-accent text-forge-dark shadow-[0_0_20px_rgba(251,146,60,0.2)]" 
                    : "text-stone-500 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            {state.stats.plan === 'Free' && (
              <button
                onClick={() => setIsPremiumModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 mb-4 p-3 bg-forge-accent/10 text-forge-accent rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-forge-accent/20 transition-colors"
              >
                <Star size={14} fill="currentColor" />
                Forge Elite
              </button>
            )}
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-forge-accent text-forge-dark flex items-center justify-center text-xs font-black">
                {state.stats.level}
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                  {state.stats.plan} Plan
                </p>
                <p className="text-sm font-bold text-white">{state.stats.xp} XP</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen bg-forge-dark">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-forge-dark/80 backdrop-blur-md border-b border-white/5 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <BrainCircuit size={20} className="text-forge-accent" />
              <span className="font-extrabold tracking-tighter font-display uppercase italic">Study Forge</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-stone-500 hover:text-stone-900"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tighter font-display text-white uppercase italic mb-2">
                    {currentView === 'dashboard' ? 'The Forge' : 
                     currentView === 'planner' ? 'Dynamic Planner' :
                     currentView === 'timer' ? 'Focus Forge' :
                     currentView === 'flashcards' ? 'Flashcard Blueprints' :
                     'Knowledge Smelters'}
                  </h2>
                  <p className="text-stone-400 mt-1 max-w-lg font-bold text-sm">
                    {currentView === 'dashboard' && "Heat up your knowledge. Forge your future."}
                    {currentView === 'planner' && "Strategize your ascent. Sort by urgency and priority."}
                    {currentView === 'timer' && "Enter the heat. Lock out distractions and master your time."}
                    {currentView === 'flashcards' && "Active recall blueprints for rapid mastery."}
                    {currentView === 'quiz' && "Smelt your knowledge in the fires of examination."}
                  </p>
                </div>

                {currentView === 'dashboard' && (
                  <AIGenerator 
                    stats={state.stats} 
                    onGenerated={handleAIGenerated}
                    onOpenPremium={() => setIsPremiumModalOpen(true)}
                  />
                )}
              </div>

              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
