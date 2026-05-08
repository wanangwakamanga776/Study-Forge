/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Timer, ListTodo, Layers, BrainCircuit, Menu, X, Star, Sparkles, Zap, Loader2, Video, Play, SkipBack, Monitor, RotateCcw, Trash2, Flame, LogOut, Trophy, BookOpen } from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { Dashboard } from './components/Dashboard';
import { LevelBar } from './components/LevelBar';
import { ForgeChat } from './components/ForgeChat';
import { ForgeHeatIcon } from './components/ForgeHeatIcon';
import { RewardProvider } from './components/RewardToast';
import { LoginPage } from './components/LoginPage';
import { ProfileHeader } from './components/ProfileHeader';
import { ForgeStoreProvider, useForgeStore } from './contexts/ForgeStoreContext';
import { CommunityLibrary } from './components/CommunityLibrary';
import { cn } from './lib/utils';
import { Deck, Quiz, ForgeCastBlueprint } from './types';
import { soundService } from './services/soundService';
import { useAuth, logout } from './services/authService';
import { useForgeEngine } from './hooks/useForgeEngine';
import { testArchivesConnection } from './services/dataService';
import { HelpCircle, Store, Shield } from 'lucide-react';
import { ThemeVisuals } from './components/ThemeVisuals';
import { AboutMePopup } from './components/AboutMeSection';

const TaskPlanner = lazy(() => import('./components/TaskPlanner').then(m => ({ default: m.TaskPlanner })));
const FocusTimer = lazy(() => import('./components/FocusTimer').then(m => ({ default: m.FocusTimer })));
const Flashcards = lazy(() => import('./components/Flashcards').then(m => ({ default: m.Flashcards })));
const QuizMode = lazy(() => import('./components/QuizMode').then(m => ({ default: m.QuizMode })));
const MatchGame = lazy(() => import('./components/MatchGame').then(m => ({ default: m.MatchGame })));
const AIGenerator = lazy(() => import('./components/AIGenerator').then(m => ({ default: m.AIGenerator })));
const ForgeCast = lazy(() => import('./components/ForgeCast').then(m => ({ default: m.ForgeCast })));
const Leaderboard = lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const ForgeTutorial = lazy(() => import('./components/ForgeTutorial').then(m => ({ default: m.ForgeTutorial })));
const ForgeShop = lazy(() => import('./components/ForgeShop').then(m => ({ default: m.ForgeShop })));
const AccountSettings = lazy(() => import('./components/AccountSettings').then(m => ({ default: m.AccountSettings })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));

type View = 'dashboard' | 'planner' | 'timer' | 'flashcards' | 'quiz' | 'match' | 'forge-library' | 'forge-player' | 'leaderboard' | 'community';

const AdminOnlyView: React.FC<{ children: React.ReactNode; isAdmin: boolean; onRedirect: () => void }> = ({ children, isAdmin, onRedirect }) => {
  React.useEffect(() => {
    if (!isAdmin) {
      onRedirect();
    }
  }, [isAdmin, onRedirect]);

  if (!isAdmin) return null;
  return <>{children}</>;
};

import { AppStateProvider } from './contexts/AppStateContext';

export default function App() {
  return (
    <AppStateProvider>
      <RewardProvider>
          <ForgeStoreProvider>
              <AppContent />
          </ForgeStoreProvider>
      </RewardProvider>
    </AppStateProvider>
  );
}

function AppContent() {
  const { state, setState, deleteForgeCast, resetToDefault } = useAppState();
  const { awardXP, level, xp, embers } = useForgeStore();
  const { setAdminMaxLevel, setAdminUnlimitedCurrency, setAdminMaxEverything } = useForgeEngine();
  const { user, loading } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedForgeCast, setSelectedForgeCast] = useState<ForgeCastBlueprint | null>(null);
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [forgeTopic, setForgeTopic] = useState<string>();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    testArchivesConnection();
  }, []);

  // Auto-set isAdmin for the specific admin email
  useEffect(() => {
    if (user && user.email === 'wanangwakamanga776@gmail.com') {
      setIsAdmin(true);
    }
  }, [user]);

  // Apply admin privileges when status is active (handles both real user and guest admin)
  useEffect(() => {
    if (isAdmin && state.stats.embers < 500000) {
      setAdminMaxEverything();
    }
  }, [isAdmin, state.stats.embers, setAdminMaxEverything]);

  // Auto-reset visuals when logged out and on home screen (LoginPage)
  useEffect(() => {
    if (!loading && !user && !isGuest) {
      const isDefaultTheme = state.stats.currentTheme === 'Default Ember';
      const isLowLevel = state.stats.level === 1;
      
      if (!isDefaultTheme || !isLowLevel) {
        resetToDefault();
      }
    }
  }, [user, isGuest, loading, state.stats.currentTheme, state.stats.level, resetToDefault]);

  const handleCloseTutorial = () => {
    localStorage.setItem('forge_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forge-dark">
        <Loader2 size={40} className="animate-spin text-forge-accent" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginPage onGuestAccess={(admin) => {
      setIsGuest(true);
      if (admin) {
        setIsAdmin(true);
      }
    }} />;
  }

  const handleLogout = () => {
    soundService.playClick();
    if (user) logout();
    setIsGuest(false);
    setIsAdmin(false);
    resetToDefault();
    setTimeout(() => window.location.reload(), 100);
  };

  if (!state || !state.stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  const handleAIGenerated = async (type: 'flashcards' | 'quiz' | 'forgeCast', data: any) => {
    let finalData = { ...data, id: data.id || crypto.randomUUID(), createdAt: data.createdAt || Date.now() };

    // If cards have prompts but no images (usually from chat), enrich them
    if (type === 'flashcards' && finalData.cards) {
      const { enrichDeckWithImages } = await import('./services/aiService');
      finalData = await enrichDeckWithImages(finalData as Deck);
    }

    setState(prev => {
      const newState = { ...prev };
      const dataWithId = finalData;

      if (type === 'flashcards') {
        const deck = dataWithId as Deck;
        // Ensure cards have IDs
        if (deck.cards) {
          deck.cards = deck.cards.map(c => ({ ...c, id: c.id || crypto.randomUUID() }));
        }
        newState.decks = [...prev.decks, deck];
        newState.stats.aiUsage.flashcards += 1;
      } else if (type === 'quiz') {
        const quiz = dataWithId as Quiz;
        // Ensure questions have IDs
        if (quiz.questions) {
          quiz.questions = quiz.questions.map(q => ({ ...q, id: q.id || crypto.randomUUID() }));
        }
        newState.quizzes = [...prev.quizzes, quiz];
        newState.stats.aiUsage.quizzes += 1;
      } else if (type === 'forgeCast') {
        newState.forgeCasts = [...prev.forgeCasts, dataWithId as ForgeCastBlueprint];
        newState.stats.aiUsage.forgeCasts += 1;
      }
      return newState;
    });
    awardXP(50);
  };

  const handleEditData = (type: 'flashcards' | 'quiz', data: any) => {
    setState(prev => {
      const newState = { ...prev };
      if (type === 'flashcards') {
        // Update the deck with matching ID or Title
        newState.decks = prev.decks.map(d => 
          (d.id === data.id || d.title.toLowerCase() === data.title.toLowerCase()) ? { 
            ...d, 
            ...data,
            cards: (data.cards || d.cards).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() }))
          } : d
        );
      } else if (type === 'quiz') {
        // Update the quiz with matching ID or Title
        newState.quizzes = prev.quizzes.map(q => 
          (q.id === data.id || q.title.toLowerCase() === data.title.toLowerCase()) ? { 
            ...q, 
            ...data,
            questions: (data.questions || q.questions).map((ques: any) => ({ ...ques, id: ques.id || crypto.randomUUID() }))
          } : q
        );
      }
      return newState;
    });
    soundService.playSuccess();
  };

  const handleAddData = async (type: 'flashcards' | 'quiz', data: any) => {
    let finalData = { ...data };
    if (type === 'flashcards' && finalData.cards) {
      const { enrichDeckWithImages } = await import('./services/aiService');
      finalData = await enrichDeckWithImages(finalData as Deck);
    }

    setState(prev => {
      const newState = { ...prev };
      if (type === 'flashcards') {
        newState.decks = prev.decks.map(d => {
          if (d.id === finalData.id || d.title.toLowerCase() === finalData.title.toLowerCase()) {
            const newCards = (finalData.cards || []).map((c: any) => ({
              ...c,
              id: c.id || crypto.randomUUID()
            }));
            return {
              ...d,
              cards: [...d.cards, ...newCards]
            };
          }
          return d;
        });
      } else if (type === 'quiz') {
        newState.quizzes = prev.quizzes.map(q => {
          if (q.id === data.id || q.title.toLowerCase() === data.title.toLowerCase()) {
            const newQuestions = (data.questions || []).map((ques: any) => ({
              ...ques,
              id: ques.id || crypto.randomUUID()
            }));
            return {
              ...q,
              questions: [...q.questions, ...newQuestions]
            };
          }
          return q;
        });
      }
      return newState;
    });
    soundService.playSuccess();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layout size={20} /> },
    { id: 'planner', label: 'Planner', icon: <ListTodo size={20} /> },
    { id: 'timer', label: 'Focus Timer', icon: <Timer size={20} /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers size={20} /> },
    { id: 'match', label: 'Match Mode', icon: <Zap size={20} /> },
    { id: 'quiz', label: 'Quiz Mode', icon: <BrainCircuit size={20} /> },
    { id: 'community', label: 'Community', icon: <BookOpen size={20} /> },
    { id: 'forge-library', label: 'Study Lessons', icon: <Video size={20} /> },
    { id: 'leaderboard', label: 'Hall of Fame', icon: <Trophy size={20} />, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  const handleMatchComplete = (xp: number, time: number, deckId: string) => {
    awardXP(xp);
    setState(prev => {
      const records = prev.matchRecords || {};
      const currentBest = records[deckId];
      if (currentBest === undefined || time < currentBest) {
        return {
          ...prev,
          matchRecords: {
            ...records,
            [deckId]: time
          }
        };
      }
      return prev;
    });
  };

  const handleAddDeck = (deck: Deck) => {
    setState(prev => ({
      ...prev,
      decks: [deck, ...prev.decks]
    }));
    soundService.playSuccess();
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            state={state} 
            onNavigate={(v) => setCurrentView(v as View)} 
            onSelectForgeCast={setSelectedForgeCast}
            onDeleteForgeCast={deleteForgeCast}
            onOpenForge={() => setIsForgeOpen(true)}
            isAdmin={isAdmin}
            isGuest={isGuest}
          />
        );
      case 'forge-library':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Study Library</h2>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Your Professional Lessons</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedForgeCast(null);
                  setCurrentView('forge-player');
                  soundService.playClick();
                }}
                className="px-6 py-2 bg-forge-accent text-forge-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform forge-glow"
              >
                New Lesson
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.forgeCasts.map(fc => (
              <motion.div
                key={fc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group glass-card rounded-[2rem] overflow-hidden border border-white/5 hover:border-forge-accent/30 transition-all cursor-pointer relative"
              >
                <div 
                  className="aspect-video relative overflow-hidden"
                  onClick={() => {
                    setSelectedForgeCast(fc);
                    setCurrentView('forge-player');
                    soundService.playClick();
                  }}
                >
                  <img 
                    src={`https://picsum.photos/seed/${fc.metadata.title}/800/450`} 
                    alt={fc.metadata.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-forge-accent text-forge-dark rounded-full flex items-center justify-center forge-glow">
                      <Play size={32} fill="currentColor" className="ml-1" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this Lesson?')) {
                      deleteForgeCast(fc.id);
                    }
                  }}
                  className="absolute top-4 right-4 p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10 backdrop-blur-md border border-red-500/20"
                >
                  <Trash2 size={18} />
                </button>

                <div 
                  className="p-8"
                  onClick={() => {
                    setSelectedForgeCast(fc);
                    setCurrentView('forge-player');
                    soundService.playClick();
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent">{fc.metadata.estimated_duration}s Lesson</span>
                    <span className="text-[10px] font-mono text-stone-600">{new Date(fc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-2">{fc.metadata.title}</h3>
                  <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">{fc.chapters.length} Modules • High Fidelity</p>
                </div>
              </motion.div>
            ))}
            {state.forgeCasts.length === 0 && (
              <div className="col-span-full py-20 text-center glass-card rounded-[2.5rem] border border-white/5">
                <Video size={64} className="mx-auto text-stone-700 mb-6" />
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-4">The Library is Empty</h3>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-8">Generate your first study lesson to see it here</p>
                <button 
                  onClick={() => {
                    setSelectedForgeCast(null);
                    setCurrentView('forge-player');
                    soundService.playClick();
                  }}
                  className="px-8 py-3 bg-white text-forge-dark rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  New Lesson
                </button>
              </div>
            )}
          </div>
        </div>
        );
      case 'forge-player':
        return (
          <ForgeCast 
            blueprint={selectedForgeCast || undefined} 
            onClose={() => setCurrentView('forge-library')}
            onSaveBlueprint={(blueprint) => {
              handleAIGenerated('forgeCast', blueprint);
            }}
            onComplete={awardXP}
            initialMode={selectedForgeCast ? 'player' : 'agent'}
          />
        );
      case 'planner':
        return (
          <TaskPlanner 
            tasks={state.tasks} 
            onUpdate={(tasks) => setState(prev => ({ ...prev, tasks }))}
            onComplete={awardXP}
          />
        );
      case 'timer':
        return <FocusTimer />;
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
            onComplete={awardXP}
          />
        );
      case 'match':
        return (
          <MatchGame 
            decks={state.decks} 
            bestRecords={state.matchRecords || {}}
            onComplete={handleMatchComplete}
          />
        );
      case 'leaderboard':
        return (
          <AdminOnlyView isAdmin={isAdmin} onRedirect={() => setCurrentView('dashboard')}>
            <Leaderboard isAdmin={isAdmin} />
          </AdminOnlyView>
        );
      case 'community':
        return <CommunityLibrary onAddDeck={handleAddDeck} onNavigate={(v) => setCurrentView(v as View)} />;
      default:
        return (
          <Dashboard 
            state={state} 
            onNavigate={(v) => setCurrentView(v as View)} 
            onSelectForgeCast={setSelectedForgeCast}
            onDeleteForgeCast={deleteForgeCast}
            onOpenForge={() => setIsForgeOpen(true)}
            isAdmin={isAdmin}
            isGuest={isGuest}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
          <ThemeVisuals />
          <AboutMePopup />
          <AnimatePresence>
            {showTutorial && <ForgeTutorial onClose={() => setShowTutorial(false)} isAdmin={isAdmin} />}
          </AnimatePresence>

          <ForgeShop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />

          <ForgeChat 
            onNavigate={(v) => setCurrentView(v as View)}
            onOpenForge={(topic) => {
              setForgeTopic(topic);
              setIsForgeOpen(true);
            }}
            onSaveData={handleAIGenerated}
            onEditData={handleEditData}
            onAddData={handleAddData}
          />

          <Suspense fallback={null}>
            <AIGenerator 
              stats={state.stats} 
              onGenerated={handleAIGenerated}
              onOpenPremium={() => setIsShopOpen(true)}
              onNavigate={(v) => setCurrentView(v as View)}
              isOpen={isForgeOpen}
              onOpenChange={setIsForgeOpen}
              initialTopic={forgeTopic}
              hideTrigger={true}
            />
          </Suspense>

          <AccountSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          <AdminPanel 
            isOpen={isAdminPanelOpen} 
            onClose={() => setIsAdminPanelOpen(false)} 
            onSetMaxLevel={setAdminMaxLevel}
            onSetUnlimitedCurrency={setAdminUnlimitedCurrency}
            currentXp={state.stats.xp}
            currentEmbers={state.stats.embers}
          />

      {/* Sidebar / Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-forge-dark border-r border-white/5 transition-transform lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6 overflow-y-auto metallic-scrollbar">
            <div className="flex items-center gap-4 mb-14">
              <div className="w-12 h-12 bg-forge-accent rounded-2xl flex items-center justify-center text-forge-dark forge-glow border border-white/10">
                <BrainCircuit size={28} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tighter font-display text-white uppercase italic drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                Study Forge <span className="text-[10px] bg-forge-accent text-forge-dark px-2 py-0.5 rounded-sm not-italic align-middle ml-1">BETA</span>
              </h1>
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

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <ForgeHeatIcon streak={state.stats.streak} />
            
            <button
                onClick={() => {
                    setIsShopOpen(true);
                    soundService.playClick();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
            >
                <Store size={14} />
                Resource Shop
            </button>

            {isAdmin && (
               <button
                  onClick={() => {
                      setIsAdminPanelOpen(true);
                      soundService.playClick();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
               >
                  <Shield size={14} />
                  Admin Console
               </button>
            )}

            {user ? (
               <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 relative group overflow-hidden">
                 <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-br from-stone-400 to-stone-600 shadow-[0_0_10px_rgba(251,146,60,0.3)] shrink-0 overflow-hidden">
                   <img src={user.photoURL || ''} alt="" className="w-full h-full rounded-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest truncate">
                     {user.displayName || 'Student'}
                   </p>
                   <p className="text-sm font-bold text-white leading-none mt-1">{embers} Embers</p>
                 </div>
                 
                 <button 
                   onClick={handleLogout}
                   className="absolute -top-2 -right-2 p-2 bg-forge-dark border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 z-10"
                   title="Log Out"
                 >
                   <LogOut size={14} />
                 </button>
               </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 relative group">
                <div className="w-8 h-8 rounded-full bg-forge-accent text-forge-dark flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(251,146,60,0.3)] shrink-0">
                  {level}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest truncate">
                    Guest Student
                  </p>
                  <p className="text-sm font-bold text-white">{xp} XP</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="absolute -top-2 -right-2 p-2 bg-forge-dark border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                  title="Session Login"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen bg-forge-dark">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-forge-dark/80 backdrop-blur-md border-b border-white/5 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-forge-accent rounded-lg flex items-center justify-center text-forge-dark forge-glow">
                <BrainCircuit size={18} strokeWidth={2.5} />
              </div>
              <span className="font-black tracking-tighter font-display uppercase italic text-white text-lg">Study Forge <span className="text-[8px] bg-forge-accent text-forge-dark px-1.5 py-0.5 rounded-xs not-italic align-middle ml-1">BETA</span></span>
            </div>
            <div className="flex items-center gap-2">
              {user && <ProfileHeader onOpenSettings={() => setIsSettingsOpen(true)} />}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-stone-500 hover:text-white"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-12">
          {/* Top Row for Desktop */}
          <div className="hidden lg:flex justify-end mb-8">
            <ProfileHeader onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
          
          <div className="mb-12">
            <LevelBar />
          </div>
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
                    {currentView === 'dashboard' ? 'Workspace' : 
                     currentView === 'planner' ? 'Dynamic Planner' :
                     currentView === 'timer' ? 'Focus Mode' :
                     currentView === 'flashcards' ? 'Flashcard Decks' :
                     currentView === 'match' ? 'Velocity Match' :
                     currentView === 'leaderboard' ? 'Elite Leaderboard' :
                     currentView === 'community' ? 'Academy Archives' :
                     'Knowledge Lab'}
                  </h2>
                  <p className="text-stone-400 mt-1 max-w-lg font-bold text-sm">
                    {currentView === 'dashboard' && "Prepare your knowledge. Build your future."}
                    {currentView === 'planner' && "Strategize your goals. Sort by urgency and priority."}
                    {currentView === 'timer' && "Enter focus mode. Block out distractions and master your time."}
                    {currentView === 'flashcards' && "Active recall decks for rapid mastery."}
                    {currentView === 'match' && "Speed is power. Match terms with their definitions."}
                    {currentView === 'quiz' && "Test your knowledge with rigorous assessment."}
                    {currentView === 'leaderboard' && "The highest-ranking academic heroes in the archives."}
                    {currentView === 'community' && "Shared repository of community-driven academic curricula."}
                  </p>
                </div>

                {currentView === 'dashboard' && (
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            setShowTutorial(true);
                            soundService.playClick();
                        }}
                        className="p-3 bg-white/5 text-stone-500 rounded-2xl hover:text-white transition-colors border border-white/5"
                        title="How to Use Study Forge"
                    >
                        <HelpCircle size={24} />
                    </button>
                    <button
                      onClick={() => {
                        setIsForgeOpen(true);
                        soundService.playClick();
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-white text-forge-dark rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] font-display font-extrabold uppercase italic tracking-tighter"
                    >
                      <Sparkles size={20} className="text-forge-accent" />
                      Lesson Generator
                    </button>
                  </div>
                )}
              </div>

              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={40} className="animate-spin text-forge-accent" />
                </div>
              }>
                {renderView()}
              </Suspense>
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
