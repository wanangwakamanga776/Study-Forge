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
  Download,
  Share2,
  Sparkles,
  Trophy
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

  const modeIcons = {
    normal_study: Layers,
    quick_review: Zap,
    detailed_mastery: Brain,
    test_prep: Target,
    eli5: Baby
  };
  const ModeIcon = modeIcons[session.mode] || BookOpen;

  const getAccentColor = () => {
    switch(session.mode) {
      case 'normal_study': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'quick_review': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'detailed_mastery': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'test_prep': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'eli5': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      default: return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                 <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", getAccentColor())}>
                   {session.mode.replace('_', ' ')}
                 </div>
                 <span className="text-slate-500 text-xs">• Study Forge Session</span>
              </div>
              <h2 className="text-xl font-bold text-white">{session.session_title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 border border-transparent hover:border-slate-700 transition-all">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 border border-transparent hover:border-slate-700 transition-all">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/50 flex gap-1">
          {[
            { id: 'overview', label: 'Briefing', icon: BookOpen },
            { id: 'content', label: session.mode_exclusive_content.type, icon: Sparkles },
            { id: 'practice', label: 'Practice Gear', icon: Trophy },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                soundService.playClick();
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-white/10 text-white shadow-sm border border-white/10" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-orange-400" : "text-current")} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-900/30">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="text-center space-y-4">
                  <PyraMascot 
                    expression="happy" 
                    message={`Welcome to ${session.session_title}`}
                    className="mb-2"
                  />
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">System Ready.</h3>
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Protocol Intelligence Layer: Engaged</p>
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-700">
                    <BookOpen size={120} />
                  </div>
                  <div className="text-slate-300 text-lg leading-relaxed relative z-10 italic font-medium tracking-tight markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{session.opening_message}</ReactMarkdown>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-orange-500/20">
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Est. Duration</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {session.flashcard_session.estimated_minutes + session.exam_session.estimated_minutes} Minutes
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Layers className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Session Load</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {session.flashcard_session.total_cards} Cards
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-300 mb-1">Session Structure</h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                      {session.flashcard_session.session_structure}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                    {session.mode_exclusive_content.type}
                  </h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>

                <div className="markdown-body p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 text-slate-300 leading-relaxed text-lg prose prose-invert max-w-none markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{session.mode_exclusive_content.content}</ReactMarkdown>
                </div>
                
                <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                  <h4 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Next Step
                  </h4>
                  <p className="text-sm text-orange-200/80 italic font-medium leading-relaxed">
                    {session.closing_prompt}
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
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Flashcard Module */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative p-6 bg-slate-800 border border-slate-700 rounded-3xl flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-6">
                        <Layers className="w-6 h-6 text-orange-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Recall Layer</h3>
                      <p className="text-sm text-slate-400 mb-8 flex-1">
                        Active recall session with {session.flashcard_session.total_cards} curated cards using the SM-2 algorithm.
                      </p>
                      <button 
                        onClick={() => onStartPractice('flashcards', session.flashcard_session.cards)}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group/btn"
                      >
                        Start Flashcards
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Exam Module */}
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative p-6 bg-slate-800 border border-slate-700 rounded-3xl flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 mb-6">
                        <Target className="w-6 h-6 text-rose-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Application Layer</h3>
                      <p className="text-sm text-slate-400 mb-8 flex-1">
                        Exam simulation with {session.exam_session.total_questions} questions worth {session.exam_session.total_marks} marks total.
                      </p>
                      <button 
                        onClick={() => {
                          console.log('Button clicked', session.exam_session.questions);
                          onStartPractice('quiz', session.exam_session.questions);
                        }}
                        className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 group/btn"
                      >
                        Launch Exam
                        <Zap className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-800 border-2 border-dashed border-slate-700 rounded-3xl">
                  <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
                    Mode Protocols
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Semantic Sync: {session.mode}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      AI Scoring: Active
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Adaptive Pacing: On
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Source Fidelity: 100%
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
