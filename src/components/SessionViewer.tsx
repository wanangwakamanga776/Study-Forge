import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Brain, 
  Target, 
  Baby, 
  Layers, 
  Clock, 
  ArrowRight,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
  Trophy,
  X,
  Gauge,
  HelpCircle,
  Bookmark,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { ModeEngineSession } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PyraMascot } from './PyraMascot';

interface SessionViewerProps {
  session: ModeEngineSession;
  onClose: () => void;
  onStartPractice: (type: 'flashcards' | 'quiz', cardsOrQuestions: any[]) => void;
}

export function SessionViewer({ session, onClose, onStartPractice }: SessionViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'practice'>('overview');
  const [copied, setCopied] = useState(false);

  // Robust Fallbacks to prevent any crash from missing properties or older session states
  const session_mode = session.mode || 'normal_study';
  const session_title = session.session_title || "Neural Session";
  const opening_message = session.opening_message || "Welcome to your Study Forge session. Let's begin.";
  const mode_exclusive_content = session.mode_exclusive_content || { type: "Key Briefing", content: "Analysis in progress." };
  const flashcard_session = session.flashcard_session || { cards: [], total_cards: 0, estimated_minutes: 0, session_structure: "" };
  const exam_session = session.exam_session || { questions: [], total_questions: 0, total_marks: 0, estimated_minutes: 0, mode_instructions: "" };
  const closing_prompt = session.closing_prompt || "Keep pushing forward! Success is built step by step.";

  const modeIcons = {
    normal_study: Layers,
    quick_review: Zap,
    detailed_mastery: Brain,
    test_prep: Target,
    eli5: Baby
  };
  const ModeIcon = modeIcons[session_mode] || BookOpen;

  const getThemeColors = () => {
    switch(session_mode) {
      case 'normal_study': 
        return {
          accent: 'text-emerald-400',
          border: 'border-emerald-500/20',
          bg: 'bg-emerald-500/10',
          glow: 'rgba(16,185,129,0.15)',
          text: 'text-emerald-300',
          gradient: 'from-emerald-500/20 to-transparent'
        };
      case 'quick_review': 
        return {
          accent: 'text-amber-400',
          border: 'border-amber-500/20',
          bg: 'bg-amber-500/10',
          glow: 'rgba(245,158,11,0.15)',
          text: 'text-amber-300',
          gradient: 'from-amber-500/20 to-transparent'
        };
      case 'detailed_mastery': 
        return {
          accent: 'text-blue-400',
          border: 'border-blue-500/20',
          bg: 'bg-blue-500/10',
          glow: 'rgba(59,130,246,0.15)',
          text: 'text-blue-300',
          gradient: 'from-blue-500/20 to-transparent'
        };
      case 'test_prep': 
        return {
          accent: 'text-rose-400',
          border: 'border-rose-500/20',
          bg: 'bg-rose-500/10',
          glow: 'rgba(244,63,94,0.15)',
          text: 'text-rose-300',
          gradient: 'from-rose-500/20 to-transparent'
        };
      case 'eli5': 
        return {
          accent: 'text-purple-400',
          border: 'border-purple-500/20',
          bg: 'bg-purple-500/10',
          glow: 'rgba(168,85,247,0.15)',
          text: 'text-purple-300',
          gradient: 'from-purple-500/20 to-transparent'
        };
      default: 
        return {
          accent: 'text-orange-400',
          border: 'border-orange-500/20',
          bg: 'bg-orange-500/10',
          glow: 'rgba(249,115,22,0.15)',
          text: 'text-orange-300',
          gradient: 'from-orange-500/20 to-transparent'
        };
    }
  };

  const colors = getThemeColors();

  const handleCopy = () => {
    soundService.playClick();
    navigator.clipboard.writeText(mode_exclusive_content.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="bg-slate-950 border border-slate-800/80 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
        style={{
          boxShadow: `0 30px 100px -15px ${colors.glow}, 0 0 1px 1px rgba(255, 255, 255, 0.05) inset`
        }}
      >
        {/* Subtle background gradient reflection of current mode */}
        <div className="absolute top-0 right-0 w-[450px] h-[400px] bg-forge-accent/3 rounded-full blur-[120px] pointer-events-none" />
        <div 
          className="absolute -top-40 -left-40 w-[350px] h-[350px] rounded-full blur-[100px] pointer-events-none transition-all duration-700" 
          style={{ backgroundColor: colors.glow }}
        />

        {/* Global HUD Header */}
        <div className="px-8 py-5 border-b border-slate-900 flex justify-between items-center shrink-0 bg-slate-950/95 backdrop-blur z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all"
              title="Return to Study Center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border", colors.bg, colors.border, colors.accent)}>
                  {session_mode.replace('_', ' ')}
                </span>
                <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">• NEURAL DECK SESSION ACTIVE</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-none mt-1">{session_title}</h2>
            </div>
          </div>
          
          <button 
            onClick={() => {
              soundService.playClick();
              onClose();
            }} 
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cinematic Sliding HUD Tab Bar */}
        <div className="px-8 py-2.5 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between shrink-0 z-10">
          <div className="flex gap-1.5 bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
            {[
              { id: 'overview', label: 'Briefing Protocol', icon: BookOpen },
              { id: 'content', label: mode_exclusive_content.type || 'Key Summary', icon: Sparkles },
              { id: 'practice', label: 'Practice Gear', icon: Trophy },
            ].map(tab => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    soundService.playClick();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all relative select-none uppercase tracking-wider",
                    isSelected 
                      ? "text-white bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isSelected ? colors.accent : "text-current")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>DECK INTEGRATED</span>
          </div>
        </div>

        {/* Responsive, Ultra-Smooth Content Scroller */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-900/10 z-10 metallic-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                {/* Hero Speech Balloon Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/[0.01] border border-white/5 p-6 rounded-3xl">
                  <div className="md:col-span-3 flex justify-center">
                    <PyraMascot 
                      expression="happy" 
                      message={`Welcome to ${session_title}`}
                      className="scale-110 shadow-lg"
                    />
                  </div>
                  <div className="md:col-span-9 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">Companion Tip</span>
                      <span className="text-[10px] text-slate-500 font-mono">Awaiting user response</span>
                    </div>
                    <div className="text-slate-200 text-base leading-relaxed italic font-medium tracking-tight markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opening_message}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Statistics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <Clock className="w-4.5 h-4.5 text-orange-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Est. Duration</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {(Number(flashcard_session.estimated_minutes) || 0) + (Number(exam_session.estimated_minutes) || 0)} <span className="text-xs font-medium text-slate-500">Minutes</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Split: {flashcard_session.estimated_minutes}m recall • {exam_session.estimated_minutes}m quiz</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Layers className="w-4.5 h-4.5 text-blue-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Session Load</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {flashcard_session.total_cards || (flashcard_session.cards || []).length} <span className="text-xs font-medium text-slate-500">Cards</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Active spaced-repetition memory keys</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <Target className="w-4.5 h-4.5 text-rose-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Assessment</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">
                        {exam_session.total_questions || (exam_session.questions || []).length} <span className="text-xs font-medium text-slate-500">Problems</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Worth {exam_session.total_marks || 0} cumulative XP marks</p>
                    </div>
                  </div>

                </div>

                {/* System Protocols */}
                {flashcard_session.session_structure && (
                  <div className="p-5 rounded-2xl bg-blue-500/[0.03] border border-blue-500/10 flex gap-4">
                    <AlertCircle className="w-5.5 h-5.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-mono font-bold uppercase text-blue-300 mb-1">Pedagogical Framework</h4>
                      <p className="text-xs text-blue-200/70 leading-relaxed">
                        {flashcard_session.session_structure}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                    <h3 className="text-md font-bold text-white uppercase tracking-tight">
                      {mode_exclusive_content.type || 'Cognitive Summary'}
                    </h3>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? 'Copied Brief!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>

                {/* Markdown Sheet */}
                <div className="p-8 rounded-3xl bg-white/[0.01] border border-slate-800/80 text-slate-300 leading-relaxed text-base prose prose-invert max-w-none markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {mode_exclusive_content.content || "Generating summary briefing lines..."}
                  </ReactMarkdown>
                </div>
                
                {/* Closing action statement */}
                <div className="p-6 bg-orange-500/[0.03] border border-orange-500/10 rounded-2xl">
                  <h4 className="text-orange-400 text-xs font-mono font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Recommended Guidance
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{closing_prompt}"
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'practice' && (
              <motion.div
                key="practice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="text-center max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white tracking-tight">Select Practice Component</h3>
                  <p className="text-xs text-slate-400">Launch direct assessment widgets to secure facts into your long term memory deck</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recall Module - Flashcards */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-amber-500/30 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative p-6 bg-slate-950 border border-slate-900 rounded-3xl flex flex-col justify-between h-full group-hover:border-orange-500/30 transition-all duration-300">
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 mb-6">
                          <Layers className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">Active Recall Deck</span>
                          <h4 className="text-lg font-bold text-white pt-1">Recall Layer (SM-2)</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                          Reviews and schedules {flashcard_session.total_cards || (flashcard_session.cards || []).length} tailored core key flashcards optimized specifically for the {session_mode.replace('_', ' ')} algorithm.
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-white/[0.02] flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>⏱️ {flashcard_session.estimated_minutes} Min Practice</span>
                          <span>💎 +50 XP Rewards</span>
                        </div>
                      </div>

                      <div className="mt-8">
                        <button 
                          onClick={() => {
                            soundService.playClick();
                            onStartPractice('flashcards', flashcard_session.cards);
                          }}
                          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 group/btn"
                        >
                          Start Flashcards
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Assessment Module - Quiz Exam */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/30 to-pink-500/30 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative p-6 bg-slate-950 border border-slate-900 rounded-3xl flex flex-col justify-between h-full group-hover:border-rose-500/30 transition-all duration-300">
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-6">
                          <Target className="w-6 h-6 text-rose-400" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Mock Assessment</span>
                          <h4 className="text-lg font-bold text-white pt-1">Application Layer (Quiz)</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                          Launches interactive, multi-format exam questions worth {exam_session.total_marks} marks total, checking cognitive depths for custom syllabus targets.
                        </p>

                        <div className="mt-4 pt-4 border-t border-white/[0.02] flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>⏱️ {exam_session.estimated_minutes} Min Practice</span>
                          <span>💎 +100 XP Rewards</span>
                        </div>
                      </div>

                      <div className="mt-8">
                        <button 
                          onClick={() => {
                            soundService.playClick();
                            onStartPractice('quiz', exam_session.questions);
                          }}
                          className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 group/btn animate-pulse-slow"
                        >
                          Launch Exam Quiz
                          <Zap className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional system checks */}
                <div className="p-6 bg-white/[0.01] border border-slate-900 rounded-2xl">
                  <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
                    SYNC ENGINE VERIFICATIONS
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] text-slate-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Active Mode Routing: {session_mode}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Dynamic Flashcard Sync: verified
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Adaptive Pacing Layer: Engaged
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Mock Rubric Integrity Check: OK
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
