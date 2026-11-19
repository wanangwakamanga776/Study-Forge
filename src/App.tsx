/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, ChevronRight, Video, Play, Trash2, BrainCircuit, ArrowLeft } from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { Dashboard } from './components/Dashboard';
import { RewardProvider } from './components/RewardToast';
import { LoginPage } from './components/LoginPage';
import { ForgeStoreProvider, useForgeStore } from './contexts/ForgeStoreContext';
import { generateId } from './lib/utils';
import { Deck, Quiz, ForgeCastBlueprint, LessonArchitectAudit, ModeEngineSession } from './types';
import { soundService } from './services/soundService';
import { logout } from './services/authService';
import { useForgeEngine } from './hooks/useForgeEngine';
import { testArchivesConnection, getGlobalAnnouncement } from './services/dataService';
import { AppStateProvider } from './contexts/AppStateContext';
import { ThemeVisuals } from './components/ThemeVisuals';
import { AboutMePopup } from './components/AboutMeSection';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { useScrollControls } from './hooks/useScrollControls';
import { FeedbackSection } from './components/FeedbackSystem';
import { AIGenerator } from './components/AIGenerator';
import { AppShell, AppRoute } from './components/layout/AppShell';
import { ForgeStudioPage } from './pages/ForgeStudioPage';
import { PracticePage } from './pages/PracticePage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';

const AnnouncementPopup: React.FC<{ announcement: { message: string }, onClose: () => void }> = ({ announcement, onClose }) => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
    <div className="sf-card w-full max-w-2xl p-7 sm:p-10 text-center">
      <p id="announcement-title" className="sf-eyebrow text-[var(--sf-orange-300)] mb-4">Announcement</p>
      <p className="text-xl sm:text-2xl font-semibold leading-snug text-white text-balance">{announcement.message}</p>
      <button type="button" onClick={onClose} className="sf-btn sf-btn-primary mt-7 mx-auto">Continue <ChevronRight size={16} /></button>
    </div>
  </div>
);

const TaskPlanner = lazy(() => import('./components/TaskPlanner.tsx').then(m => ({ default: m.TaskPlanner })));
const FocusTimer = lazy(() => import('./components/FocusTimer.tsx').then(m => ({ default: m.FocusTimer })));
const Flashcards = lazy(() => import('./components/Flashcards'));
const QuizMode = lazy(() => import('./components/QuizMode.tsx').then(m => ({ default: m.QuizMode })));
const MatchGame = lazy(() => import('./components/MatchGame.tsx').then(m => ({ default: m.MatchGame })));
const ForgeCast = lazy(() => import('./components/ForgeCast.tsx').then(m => ({ default: m.ForgeCast })));
const Leaderboard = lazy(() => import('./components/Leaderboard.tsx').then(m => ({ default: m.Leaderboard })));
const ForgeTutorial = lazy(() => import('./components/ForgeTutorial.tsx').then(m => ({ default: m.ForgeTutorial })));
const ForgeShop = lazy(() => import('./components/ForgeShop').then(m => ({ default: m.ForgeShop })));
const AccountSettings = lazy(() => import('./components/AccountSettings.tsx').then(m => ({ default: m.AccountSettings })));
const AdminPanel = lazy(() => import('./components/AdminPanel.tsx').then(m => ({ default: m.AdminPanel })));
const StudyGuideViewer = lazy(() => import('./components/StudyGuideViewer.tsx').then(m => ({ default: m.StudyGuideViewer })));
const ExamSimulator = lazy(() => import('./components/ExamSimulator'));
const LessonManager = lazy(() => import('./components/LessonManager.tsx').then(m => ({ default: m.LessonManager })));
const SessionViewer = lazy(() => import('./components/SessionViewer.tsx').then(m => ({ default: m.SessionViewer })));
const ForgeChat = lazy(() => import('./components/ForgeChat.tsx').then(m => ({ default: m.ForgeChat })));
const CommunityLibrary = lazy(() => import('./components/CommunityLibrary.tsx').then(m => ({ default: m.CommunityLibrary })));

type View = 'dashboard' | 'planner' | 'timer' | 'flashcards' | 'quiz' | 'match' | 'forge-library' | 'forge-player' | 'leaderboard' | 'community' | 'exam' | 'ai-exam' | 'lessons' | 'feedback' | 'study-guide';

const AdminOnlyView: React.FC<{ children: React.ReactNode; isAdmin: boolean; onRedirect: () => void }> = ({ children, isAdmin, onRedirect }) => {
  useEffect(() => { if (!isAdmin) onRedirect(); }, [isAdmin, onRedirect]);
  if (!isAdmin) return null;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <RewardProvider>
          <ForgeStoreProvider>
            <AppContent />
          </ForgeStoreProvider>
        </RewardProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { state, setState, deleteForgeCast, resetToDefault } = useAppState();
  const { awardXP, atmosphere, clearAtmosphere } = useForgeStore();
  const { setAdminMaxLevel, setAdminUnlimitedCurrency, setAdminMaxEverything } = useForgeEngine();
  useScrollControls({ speed: 45 });
  const { user, loading } = useAuthContext();

  const [route, setRoute] = useState<AppRoute>('home');
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedForgeCast, setSelectedForgeCast] = useState<ForgeCastBlueprint | null>(null);
  const [isForgeOpen, setIsForgeOpen] = useState(false);
  const [forgeTopic, setForgeTopic] = useState<string>();
  const [showTutorial, setShowTutorial] = useState(false);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{ message: string } | null>(null);
  const [activeExam, setActiveExam] = useState<Quiz | null>(null);
  const [showLessons, setShowLessons] = useState(false);
  const [activeSession, setActiveSession] = useState<ModeEngineSession | null>(null);
  const [activeAIExam, setActiveAIExam] = useState<{ exam: any; audit: any } | null>(null);
  const [isAdminApplied, setIsAdminApplied] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    testArchivesConnection();
    getGlobalAnnouncement().then(data => { if (data && data.active) setGlobalAnnouncement(data); }).catch(() => {});
  }, []);

  useEffect(() => { if (user && user.email === 'wanangwakamanga776@gmail.com') setIsAdmin(true); }, [user]);

  useEffect(() => {
    if (!state?.stats) return;
    if (isAdmin && state.stats.embers < 500000 && !isAdminApplied) { setAdminMaxEverything(); setIsAdminApplied(true); }
  }, [isAdmin, state?.stats?.embers, setAdminMaxEverything, isAdminApplied, state]);

  useEffect(() => {
    if (!loading && !user && !isGuest && state?.stats) {
      if (state.stats.currentTheme !== 'Default Ember' || state.stats.level !== 1) resetToDefault();
    }
  }, [user, isGuest, loading, state?.stats?.currentTheme, state?.stats?.level, resetToDefault, state]);

  useEffect(() => { if (route !== 'home') setShowLessons(false); }, [route]);
  useEffect(() => { if (isShopOpen || isSettingsOpen || isAdminPanelOpen) setShowLessons(false); }, [isShopOpen, isSettingsOpen, isAdminPanelOpen]);

  const handleAIGenerated = useCallback(async (type: 'flashcards' | 'quiz' | 'forgeCast' | 'lesson' | 'session', data: any) => {
    setTimeout(async () => {
      try {
        let finalData = { ...data, id: data.id || generateId(), createdAt: data.createdAt || Date.now() };
        if (type === 'flashcards' && finalData.cards) {
          const { enrichDeckWithImages } = await import('./services/aiService');
          finalData = await enrichDeckWithImages(finalData as Deck);
        }
        setState(prev => {
          const newState = { ...prev };
          if (type === 'flashcards') {
            const deck = finalData as Deck;
            if (deck.cards) deck.cards = deck.cards.map(c => ({ ...c, id: c.id || generateId() }));
            newState.decks = [deck, ...prev.decks];
            newState.stats.aiUsage.flashcards += 1;
          } else if (type === 'quiz') {
            const quiz = finalData as Quiz;
            if (quiz.questions) quiz.questions = quiz.questions.map(q => ({ ...q, id: q.id || generateId() }));
            newState.quizzes = [quiz, ...prev.quizzes];
            newState.stats.aiUsage.quizzes += 1;
          } else if (type === 'forgeCast') {
            newState.forgeCasts = [finalData as ForgeCastBlueprint, ...prev.forgeCasts];
            newState.stats.aiUsage.forgeCasts += 1;
          } else if (type === 'lesson') {
            newState.lessons = [...(prev.lessons || []), finalData as LessonArchitectAudit];
            setTimeout(() => { setRoute('forge'); setCurrentView('lessons'); setShowLessons(true); }, 0);
          } else if (type === 'session') {
            newState.sessions = [...(prev.sessions || []), finalData as ModeEngineSession];
          }
          return newState;
        });
        awardXP(50);
      } catch (error) {
        console.error('Failed to process AI generated content:', error);
      }
    }, 0);
  }, [setState, awardXP]);

  const handleEditData = useCallback((type: 'flashcards' | 'quiz', data: any) => {
    setState(prev => {
      const newState = { ...prev };
      if (type === 'flashcards') {
        newState.decks = prev.decks.map(d => (d.id === data.id || d.title.toLowerCase() === data.title.toLowerCase()) ? { ...d, ...data, cards: (data.cards || d.cards).map((c: any) => ({ ...c, id: c.id || generateId() })) } : d);
      } else if (type === 'quiz') {
        newState.quizzes = prev.quizzes.map(q => (q.id === data.id || q.title.toLowerCase() === data.title.toLowerCase()) ? { ...q, ...data, questions: (data.questions || q.questions).map((ques: any) => ({ ...ques, id: ques.id || generateId() })) } : q);
      }
      return newState;
    });
    soundService.playSuccess();
  }, [setState]);

  const handleAddData = useCallback(async (type: 'flashcards' | 'quiz', data: any) => {
    try {
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
              const newCards = (finalData.cards || []).map((c: any) => ({ ...c, id: c.id || generateId() }));
              return { ...d, cards: [...d.cards, ...newCards] };
            }
            return d;
          });
        } else if (type === 'quiz') {
          newState.quizzes = prev.quizzes.map(q => {
            if (q.id === data.id || q.title.toLowerCase() === data.title.toLowerCase()) {
              const newQuestions = (data.questions || []).map((ques: any) => ({ ...ques, id: ques.id || generateId() }));
              return { ...q, questions: [...q.questions, ...newQuestions] };
            }
            return q;
          });
        }
        return newState;
      });
      soundService.playSuccess();
    } catch (error) {
      console.error('Failed to add data:', error);
    }
  }, [setState]);

  const handleMatchComplete = (xp: number, time: number, deckId: string) => {
    awardXP(xp);
    setState(prev => {
      const records = prev.matchRecords || {};
      const currentBest = records[deckId];
      if (currentBest === undefined || time < currentBest) return { ...prev, matchRecords: { ...records, [deckId]: time } };
      return prev;
    });
  };

  const handleAddDeck = (deck: Deck) => {
    setState(prev => ({ ...prev, decks: [deck, ...prev.decks] }));
    soundService.playSuccess();
  };

  const handleLogout = () => {
    soundService.playClick();
    if (user) logout();
    setIsGuest(false);
    setIsAdmin(false);
    resetToDefault();
    setTimeout(() => window.location.reload(), 100);
  };

  const openForge = useCallback((topic?: string) => { setForgeTopic(topic); setIsForgeOpen(true); }, []);
  const learnerName = (user?.displayName || state?.stats?.name || state?.stats?.studentName || 'Student') as string;

  const handleNavigateFeature = useCallback((view: string) => {
    const v = view as View;
    setCurrentView(v);
    if (['dashboard', 'planner', 'timer'].includes(view)) setRoute('home');
    else if (['flashcards', 'lessons', 'study-guide', 'forge-library', 'forge-player', 'community', 'forge'].includes(view)) setRoute('forge');
    else if (['quiz', 'match', 'exam', 'ai-exam', 'practice'].includes(view)) setRoute('practice');
    else if (['leaderboard', 'map'].includes(view)) setRoute('progress');
    else if (['feedback'].includes(view)) setRoute('profile');
    if (view === 'lessons') setShowLessons(true);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--sf-bg)]"><Loader2 size={36} className="animate-spin text-[var(--sf-orange-400)]" /><p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--sf-text-subtle)]">Loading Study Forge</p></div>;
  }
  if (!user && !isGuest) {
    return <LoginPage onGuestAccess={(admin) => { setIsGuest(true); if (admin) setIsAdmin(true); }} />;
  }
  if (!state?.stats) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--sf-bg)]"><Loader2 size={28} className="animate-spin text-[var(--sf-orange-400)]" /></div>;
  }

  const renderLegacyFeature = () => {
    switch (currentView) {
      case 'planner': return <TaskPlanner tasks={state.tasks} onUpdate={(tasks) => setState(prev => ({ ...prev, tasks }))} onComplete={awardXP} />;
      case 'timer': return <FocusTimer />;
      case 'flashcards': return <Flashcards decks={state.decks} onUpdate={(decks) => setState(prev => ({ ...prev, decks }))} />;
      case 'quiz': return <QuizMode quizzes={state.quizzes} onUpdate={(quizzes) => setState(prev => ({ ...prev, quizzes }))} onComplete={awardXP} onStartExam={(exam) => { setActiveExam(exam); setCurrentView('exam'); setRoute('practice'); }} />;
      case 'exam': return activeExam ? (
        <ExamSimulator
          exam={{ exam_id: activeExam.id, title: activeExam.title, level: 'standard', exam_board_style: 'standard', total_marks: activeExam.questions.length, time_limit_minutes: activeExam.timeLimit || 15, sections: [{ section_id: 's1', section_title: 'Core Assessment', section_instructions: 'Complete all questions.', marks_available: activeExam.questions.length, time_recommendation_minutes: activeExam.timeLimit || 15, questions: activeExam.questions.map(q => ({ question_id: q.id, type: 'mcq', marks: 1, question_text: q.question, options: q.options, topic_tag: 'General', targets_weak_area: false, is_trick_question: false, cognitive_demand: 'recall', HIDDEN_correct_answer: q.options[q.correctAnswer], HIDDEN_mark_scheme: q.explanation || 'No explanation provided.', HIDDEN_model_answer: q.options[q.correctAnswer], HIDDEN_common_mistakes: [], HIDDEN_examiner_tip: '' })) }], difficulty_profile: 'standard', instructions: 'Standard assessment.', difficulty_map: { accessible_question_ids: [], target_question_ids: [], stretch_question_ids: [] } }}
          auditData={{ audit_metadata: { title: activeExam.title, subject: 'General', level_detected: 'standard', content_type: 'quiz', word_count: 0, academic_density_score: 5, exam_relevance_score: 5, estimated_mastery_hours: 1, prerequisite_knowledge: [] }, semantic_map: { central_thesis: '', causal_chains: [], concept_hierarchy: [] }, misconception_map: [], memory_layer: { flashcard_deck: [], total_cards: 0 }, application_layer: { exam_questions: [] }, mode_routing: { normal_study_card_ids: [], quick_review_card_ids: [], detailed_mastery_card_ids: [], test_prep_question_ids: [], eli5_concept_ids: [] }, forgecast_brief: { hook_premise: '', core_technical_points: [], best_analogy_candidates: [], summary_statement: '' }, forgechat_context_block: '' }}
          onClose={() => { setState(prev => ({ ...prev, lessons: (prev.lessons || []).map(l => l.audit_metadata.title === activeExam.title ? { ...l, last_session_at: Date.now() } : l) })); setCurrentView('quiz'); }}
          onComplete={(attempt) => { setState(prev => ({ ...prev, quizzes: prev.quizzes.map(q => q.id === activeExam.id ? { ...q, examHistory: [...(q.examHistory || []), attempt] } : q) })); setCurrentView('quiz'); }}
        />) : null;
      case 'ai-exam': return activeAIExam ? (
        <ExamSimulator exam={activeAIExam.exam} auditData={activeAIExam.audit}
          onClose={() => { setState(prev => ({ ...prev, lessons: (prev.lessons || []).map(l => l.id === activeAIExam.audit.id ? { ...l, last_session_at: Date.now() } : l) })); setCurrentView('lessons'); setRoute('forge'); }}
          onAddRevisionPlan={(plan) => { const deck: Deck = { id: 'revision-' + generateId(), title: 'REVISION: ' + plan.forge_revision_plan.plan_title, cards: plan.forge_revision_plan.crash_course_flashcard_deck.map(c => ({ id: c.card_id, term: c.front, definition: c.back, explanation: c.why_this_card_was_created, cardType: c.card_type as any, memoryHook: c.memory_hook, hint: c.hint, ease: c.sm2_initial_ease_factor, interval: c.sm2_initial_interval_days })) }; setState(prev => ({ ...prev, decks: [deck, ...prev.decks] })); }}
          onComplete={(attempt) => { setState(prev => ({ ...prev, lessons: (prev.lessons || []).map(l => l.id === activeAIExam.audit.id ? { ...l, last_session_at: Date.now(), completed_sessions_count: (l.completed_sessions_count || 0) + 1, mastery_score: Math.max(l.mastery_score || 0, attempt.results.percentage) } : l) })); setCurrentView('lessons'); setRoute('forge'); }}
        />) : null;
      case 'match': return <MatchGame decks={state.decks} bestRecords={state.matchRecords || {}} onComplete={handleMatchComplete} />;
      case 'leaderboard': return <AdminOnlyView isAdmin={isAdmin} onRedirect={() => { setRoute('progress'); setCurrentView('dashboard'); }}><Leaderboard isAdmin={isAdmin} /></AdminOnlyView>;
      case 'community': return <CommunityLibrary onAddDeck={handleAddDeck} onNavigate={handleNavigateFeature} />;
      case 'study-guide': return <StudyGuideViewer />;
      case 'feedback': return <FeedbackSection />;
      case 'forge-library': return (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold text-white">Library</h2><p className="text-sm text-[var(--sf-text-muted)]">Your lessons and generated materials.</p></div><button type="button" onClick={() => { setSelectedForgeCast(null); setCurrentView('forge-player'); }} className="min-h-11 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black">New lesson</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {state.forgeCasts.map(fc => (
              <div key={fc.id} className="rounded-2xl border border-white/10 bg-[var(--sf-surface)] overflow-hidden">
                <button type="button" className="block w-full aspect-video bg-black/30 relative" onClick={() => { setSelectedForgeCast(fc); setCurrentView('forge-player'); }}><img src={`https://picsum.photos/seed/${encodeURIComponent(fc.metadata.title)}/800/450`} alt="" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" /><span className="absolute inset-0 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--sf-orange-500)] text-black"><Play size={22} fill="currentColor" className="ml-1" /></span></span></button>
                <div className="p-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{fc.metadata.title}</p><p className="text-xs text-[var(--sf-text-subtle)] mt-1">{fc.chapters.length} modules</p></div><button type="button" aria-label="Delete lesson" className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" onClick={() => { if (window.confirm('Delete this lesson?')) deleteForgeCast(fc.id); }}><Trash2 size={16} /></button></div>
              </div>
            ))}
            {state.forgeCasts.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center"><Video size={40} className="mx-auto text-white/30 mb-3" /><p className="text-white font-medium">No lessons yet</p></div>}
          </div>
        </div>);
      case 'forge-player': return <ForgeCast blueprint={selectedForgeCast || undefined} onClose={() => setCurrentView('forge-library')} onSaveBlueprint={(blueprint) => { handleAIGenerated('forgeCast', blueprint); }} onComplete={awardXP} initialMode={selectedForgeCast ? 'player' : 'agent'} />;
      case 'lessons': return (
        <div className="space-y-6">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold text-white">Lessons</h2><button type="button" className="min-h-11 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black" onClick={() => openForge()}>New lesson</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {(state.lessons || []).map(lesson => (
              <button key={lesson.id} type="button" className="text-left rounded-2xl border border-white/10 bg-[var(--sf-surface)] p-5 hover:border-[var(--sf-orange-400)]/30" onClick={() => { setShowLessons(true); soundService.playClick(); }}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--sf-orange-300)]">{lesson.audit_metadata.level_detected}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{lesson.audit_metadata.title}</h3>
                <p className="mt-2 text-sm text-[var(--sf-text-subtle)] line-clamp-2">{lesson.semantic_map?.central_thesis || 'Ready to study.'}</p>
              </button>
            ))}
            {(!state.lessons || state.lessons.length === 0) && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center"><BrainCircuit size={40} className="mx-auto text-white/30 mb-3" /><p className="text-white font-medium">No lessons yet</p></div>}
          </div>
        </div>);
      default: return null;
    }
  };

  const isLegacyViewActive = !['dashboard'].includes(currentView);
  const renderRoute = () => {
    if (route === 'home') {
      if (isLegacyViewActive && ['planner', 'timer'].includes(currentView)) return renderLegacyFeature();
      return <Dashboard state={state} onNavigate={handleNavigateFeature} onSelectForgeCast={setSelectedForgeCast} onDeleteForgeCast={deleteForgeCast} onOpenForge={() => openForge()} isAdmin={isAdmin} isGuest={isGuest} />;
    }
    if (route === 'map') {
      return <Dashboard state={state} onNavigate={handleNavigateFeature} onSelectForgeCast={setSelectedForgeCast} onDeleteForgeCast={deleteForgeCast} onOpenForge={() => openForge()} isAdmin={isAdmin} isGuest={isGuest} />;
    }
    if (route === 'forge') {
      if (['flashcards', 'forge-library', 'forge-player', 'lessons', 'study-guide', 'community'].includes(currentView)) return renderLegacyFeature();
      return <ForgeStudioPage state={state} onOpenForge={openForge} onNavigate={handleNavigateFeature} />;
    }
    if (route === 'practice') {
      if (['quiz', 'match', 'exam', 'ai-exam'].includes(currentView)) return renderLegacyFeature();
      return <PracticePage state={state} onNavigate={handleNavigateFeature} onAward={awardXP} />;
    }
    if (route === 'progress') {
      if (currentView === 'leaderboard') return renderLegacyFeature();
      return <ProgressPage state={state} />;
    }
    if (route === 'profile') {
      if (currentView === 'feedback') return renderLegacyFeature();
      return <ProfilePage state={state} learnerName={learnerName} isGuest={isGuest} onOpenSettings={() => setIsSettingsOpen(true)} onLogout={handleLogout} />;
    }
    return <Dashboard state={state} onNavigate={handleNavigateFeature} onSelectForgeCast={setSelectedForgeCast} onDeleteForgeCast={deleteForgeCast} onOpenForge={() => openForge()} isAdmin={isAdmin} isGuest={isGuest} />;
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)]">
      <ThemeVisuals isSidebarCollapsed={true} />
      <AboutMePopup />
      <AnimatePresence>
        {globalAnnouncement && <AnnouncementPopup announcement={globalAnnouncement} onClose={() => setGlobalAnnouncement(null)} />}
        {showTutorial && <ForgeTutorial onClose={() => { localStorage.setItem('forge_tutorial_seen', 'true'); setShowTutorial(false); }} isAdmin={isAdmin} />}
        {showLessons && route === 'forge' && <LessonManager lessons={state.lessons || []} stats={state.stats} onLaunchSession={(session) => { setShowLessons(false); setActiveSession(session); handleAIGenerated('session', session); }} onLaunchExam={(exam, audit) => { setShowLessons(false); setActiveAIExam({ exam, audit }); setCurrentView('ai-exam'); setRoute('practice'); }} onClose={() => setShowLessons(false)} />}
        {activeSession && <SessionViewer session={activeSession} onClose={() => { const lessonId = activeSession.lessonId; setState(prev => ({ ...prev, lessons: (prev.lessons || []).map(l => l.id === lessonId ? { ...l, last_session_at: Date.now(), completed_sessions_count: (l.completed_sessions_count || 0) + 1 } : l) })); setActiveSession(null); }} onStartPractice={(type, data) => { const lessonId = activeSession.lessonId; setState(prev => ({ ...prev, lessons: (prev.lessons || []).map(l => l.id === lessonId ? { ...l, last_session_at: Date.now(), completed_sessions_count: (l.completed_sessions_count || 0) + 1 } : l) })); if (type === 'flashcards') { const cardsArray = Array.isArray(data) ? data : []; const deck: Deck = { id: 'session-' + (activeSession.id || generateId()), title: activeSession.session_title || 'Flashcards Session', cards: cardsArray.map((c: any) => ({ id: c.card_id || generateId(), term: c.front || 'Term', definition: c.back || 'Definition', explanation: c.mode_specific_tip || '', hint: c.hint || '', ease: Number(c.sm2_initial_ease_factor) || 2.5, interval: Number(c.sm2_initial_interval_days) || 1, memoryHook: c.memory_hook || '' })) }; setState(prev => ({ ...prev, decks: [deck, ...prev.decks] })); setCurrentView('flashcards'); setRoute('forge'); } else { let questionsData = Array.isArray(data) ? data : []; if (questionsData.length === 0) { const lesson = state.lessons?.find(l => l.id === activeSession.lessonId); if (lesson && lesson.application_layer?.exam_questions) questionsData = lesson.application_layer.exam_questions; } if (!Array.isArray(questionsData)) questionsData = []; const quiz: Quiz = { id: 'session-quiz-' + (activeSession.id || generateId()), title: activeSession.session_title || 'Quiz Session', questions: questionsData.map((q: any) => { const options = Array.isArray(q.options) ? q.options : []; const correctAnswerVal = q.correct_answer || q.model_answer || ''; let correctAnswerIdx = options.indexOf(correctAnswerVal); if (correctAnswerIdx < 0 && options.length > 0) correctAnswerIdx = 0; return { id: q.question_id || generateId(), question: q.question || q.question_text || q.text || 'Identify the correct concept', type: q.type || 'mcq', marks: Number(q.marks) || 1, options, correctAnswer: correctAnswerIdx >= 0 ? correctAnswerIdx : 0, correctAnswerText: correctAnswerVal, explanation: q.mark_scheme || q.explanation || 'No explanation provided.' }; }) }; setState(prev => ({ ...prev, quizzes: [quiz, ...prev.quizzes] })); setCurrentView('quiz'); setRoute('progress'); } setActiveSession(null); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {atmosphere && (
          <motion.div key={atmosphere.theme_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="sf-card w-full max-w-lg p-7 text-center" role="dialog" aria-modal="true">
              <button type="button" onClick={() => clearAtmosphere()} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-lg text-[var(--sf-text-subtle)] hover:bg-white/[0.06] hover:text-white" aria-label="Dismiss"><X size={18} /></button>
              <p className="sf-eyebrow text-[var(--sf-orange-300)] mb-3">Session ready</p>
              <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-white mb-3">{atmosphere.session_greeting}</h2>
              <p className="text-[14px] leading-6 text-[var(--sf-text-muted)] mb-6">{atmosphere.forgecast_atmosphere_line}</p>
              <button type="button" onClick={() => clearAtmosphere()} className="sf-btn sf-btn-primary mx-auto">Continue <ChevronRight size={16} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ForgeShop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
      <ForgeChat onNavigate={handleNavigateFeature} onOpenForge={openForge} onSaveData={handleAIGenerated} onEditData={handleEditData} onAddData={handleAddData} activeLesson={activeSession ? state.lessons.find(l => l.id === activeSession.lessonId) : activeAIExam ? activeAIExam.audit : undefined} />
      <AIGenerator stats={state.stats} onGenerated={handleAIGenerated} onOpenPremium={() => setIsShopOpen(true)} onNavigate={handleNavigateFeature} isOpen={isForgeOpen} onOpenChange={setIsForgeOpen} initialTopic={forgeTopic} hideTrigger={true} isAdmin={isAdmin} />
      <AccountSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AdminPanel isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} onSetMaxLevel={setAdminMaxLevel} onSetUnlimitedCurrency={setAdminUnlimitedCurrency} currentXp={state.stats.xp} currentEmbers={state.stats.embers} />

      <AppShell route={route} onRouteChange={(r) => { setRoute(r); setCurrentView('dashboard'); }} learnerName={learnerName} streak={state.stats.streak || 0} isAdmin={isAdmin} onOpenSettings={() => setIsSettingsOpen(true)} onLogout={handleLogout}>
        <div className="space-y-6">
          {isLegacyViewActive && <button type="button" onClick={() => setCurrentView('dashboard')} className="sf-btn sf-btn-ghost -ml-3 min-h-9 px-3 text-[13px]"><ArrowLeft size={15} aria-hidden="true" /> Back</button>}
          <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-[var(--sf-orange-400)]" size={32} aria-label="Loading" /></div>}>
            {renderRoute()}
          </Suspense>
        </div>
      </AppShell>
    </div>
  );
}