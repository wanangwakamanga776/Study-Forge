import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  Zap, 
  Brain, 
  Target, 
  Baby, 
  Layers, 
  Clock, 
  Star,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { LessonArchitectAudit, ModeEngineSession, StudyMode, UserStats, ExamSimulatorOutput } from '../types';
import { generateModeSession, generateExamSimulatorAction } from '../services/aiService';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface LessonManagerProps {
  lessons: LessonArchitectAudit[];
  stats: UserStats;
  onLaunchSession: (session: ModeEngineSession) => void;
  onLaunchExam: (exam: ExamSimulatorOutput['exam'], audit: LessonArchitectAudit) => void;
  onClose: () => void;
}

export function LessonManager({ lessons, stats, onLaunchSession, onLaunchExam, onClose }: LessonManagerProps) {
  const [selectedLesson, setSelectedLesson] = useState<LessonArchitectAudit | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLaunchExam = async () => {
    if (!selectedLesson) return;
    
    soundService.playClick();
    setIsGenerating(true);
    
    try {
      const response = await generateExamSimulatorAction('generate_exam', {
        student_context: {
          name: stats.name || 'Scholar',
          level: stats.level > 10 ? 'university' : 'a_level',
          exam_board_style: 'AQA', // Default or from context
          weak_topics: [],
          strong_topics: [],
          srs_mature_topics: [],
          previous_exam_scores: [],
          days_until_real_exam: 30
        },
        audit_data: selectedLesson
      }) as ExamSimulatorOutput;
      
      onLaunchExam(response.exam, selectedLesson);
    } catch (error) {
      console.error("Failed to generate exam:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchMode = async (mode: StudyMode) => {
    if (!selectedLesson) return;
    
    soundService.playClick();
    setIsGenerating(true);
    
    try {
      const session = await generateModeSession(selectedLesson, mode, {
        name: stats.name || 'Scholar',
        level: stats.level.toString(),
        weak_topics: [],
        current_streak: stats.streak
      });
      
      onLaunchSession(session);
    } catch (error) {
      console.error("Failed to generate session:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const modes: { id: StudyMode, icon: any, label: string, desc: string, color: string, textColor: string }[] = [
    { 
      id: 'normal_study', 
      icon: Layers, 
      label: 'Normal Study', 
      desc: 'Standard pedagogical balance of core concepts.',
      color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
      textColor: 'text-emerald-400'
    },
    { 
      id: 'quick_review', 
      icon: Zap, 
      label: 'Quick Review', 
      desc: 'Highest-yield facts only. Perfect for 5-minute bursts.',
      color: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
      textColor: 'text-amber-400'
    },
    { 
      id: 'detailed_mastery', 
      icon: Brain, 
      label: 'Detailed Mastery', 
      desc: 'Deep dive into every detail. Separates B from A* level.',
      color: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
      textColor: 'text-blue-400'
    },
    { 
      id: 'test_prep', 
      icon: Target, 
      label: 'Test Prep', 
      desc: 'Simulation of exam conditions with trick questions.',
      color: 'bg-rose-500/20 border-rose-500/30 text-rose-300',
      textColor: 'text-rose-400'
    },
    { 
      id: 'eli5', 
      icon: Baby, 
      label: 'ELI5 Mode', 
      desc: 'Big ideas made simple with surprising analogies.',
      color: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
      textColor: 'text-purple-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <BookOpen className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Study Center</h2>
              <p className="text-sm text-slate-400">Manage your study materials and activities</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Lessons List */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
            <h3 className="px-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Available Audits</h3>
            {lessons.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 italic">No audits generated yet. Upload material first!</p>
              </div>
            ) : (
              lessons.map(lesson => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    soundService.playClick();
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-300",
                    selectedLesson?.id === lesson.id 
                      ? "bg-slate-800 border-orange-500/50 shadow-lg shadow-orange-500/5" 
                      : "bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-white leading-tight mb-1">{lesson.audit_metadata.title}</h4>
                    <Star className={cn("w-4 h-4 shrink-0 mt-1", lesson.audit_metadata.exam_relevance_score > 7 ? "text-amber-400 fill-amber-400" : "text-slate-600")} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                      {lesson.audit_metadata.subject}
                    </span>
                    {lesson.mastery_score !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Mastery: {Math.round(lesson.mastery_score)}%
                      </span>
                    )}
                    {lesson.last_session_at && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Activity: {new Date(lesson.last_session_at).toLocaleDateString()}
                      </span>
                    )}
                    {!lesson.mastery_score && !lesson.last_session_at && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        New Audit
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Details & Mode Picker */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <AnimatePresence mode="wait">
              {selectedLesson ? (
                <motion.div
                  key={selectedLesson.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Lesson Meta */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{selectedLesson.audit_metadata.estimated_mastery_hours}h</div>
                      <div className="text-[10px] text-slate-500 uppercase">Est. Mastery</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <Zap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{selectedLesson.application_layer?.exam_questions?.length || 0}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Questions</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <Target className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{selectedLesson.audit_metadata.exam_relevance_score}/10</div>
                      <div className="text-[10px] text-slate-500 uppercase">Exam Relevance</div>
                    </div>
                  </div>

                  {/* Semantic Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-orange-400" />
                       Summary
                    </h3>
                    <div className="text-slate-300 italic text-sm leading-relaxed bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{selectedLesson.semantic_map?.central_thesis || 'Understanding topic...'}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Mode Engine Header */}
                  <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      Launch Mode Engine
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 font-mono">
                      Select a learning simulation layer for this content.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        disabled={isGenerating}
                        onClick={handleLaunchExam}
                        className={cn(
                          "group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left bg-forge-accent/20 border-forge-accent/30 text-forge-accent shadow-[0_0_30px_rgba(251,146,60,0.1)]",
                          isGenerating ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        )}
                      >
                        <div className="shrink-0 p-3 rounded-xl bg-black/40 border border-white/10 text-forge-accent">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-white flex items-center gap-2 uppercase italic tracking-tighter">
                            AI Exam Simulator
                            <Sparkles size={14} className="text-forge-accent animate-pulse" />
                            {!isGenerating && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-auto" />}
                          </div>
                          <div className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">Full Assessment • 15min • Pro Grading</div>
                        </div>
                      </button>

                      {modes.map(mode => (
                        <button
                          key={mode.id}
                          disabled={isGenerating}
                          onClick={() => handleLaunchMode(mode.id)}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left",
                            mode.color,
                            isGenerating ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          )}
                        >
                          <div className={cn("shrink-0 p-3 rounded-xl bg-black/40 border border-white/10", mode.textColor)}>
                            <mode.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white flex items-center gap-2">
                              {mode.label}
                              {!isGenerating && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />}
                            </div>
                            <div className="text-xs text-slate-300 truncate opacity-70">{mode.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-600">Select an audit to begin</h3>
                  <p className="text-sm text-slate-500 mt-2">Study Forge will architecture the learning experience</p>
                </div>
              )}
            </AnimatePresence>

            {isGenerating && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Forging Session...</h3>
                <p className="text-slate-400 mt-2">Mode Engine is rendering semantic layers</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
