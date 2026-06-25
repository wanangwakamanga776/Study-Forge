import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Zap, Brain, Target, Baby, Layers,
  Clock, Star, ArrowRight, Loader2, CheckCircle2, FileText,
  Sparkles, AlertTriangle, X, Search, ShieldCheck, Trophy, Gauge, BookMarked
} from 'lucide-react';
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
  const [selectedLesson, setSelectedLesson] = useState<LessonArchitectAudit | null>(lessons[0] || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatingMode, setGeneratingMode] = useState<string | null>(null);

  const sortedLessons = [...lessons].sort((a, b) => {
    const aTime = a.last_session_at || a.createdAt || 0;
    const bTime = b.last_session_at || b.createdAt || 0;
    return (bTime as number) - (aTime as number);
  });

  const filteredLessons = sortedLessons.filter(l => 
    l.audit_metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.audit_metadata.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunchExam = async () => {
    if (!selectedLesson) return;
    soundService.playClick();
    setIsGenerating(true);
    setGeneratingMode('Exam Simulator');
    try {
      const response = await generateExamSimulatorAction('generate_exam', {
        student_context: { name: stats.name || 'Scholar', level: stats.level > 10 ? 'university' : 'a_level' },
        audit_data: selectedLesson,
      }) as ExamSimulatorOutput;
      onLaunchExam(response.exam, selectedLesson);
    } catch (err: any) { 
      setGenerationError(err.message || 'Failed to compile AI Exam simulation. Please retry.'); 
    } finally { 
      setIsGenerating(false); 
      setGeneratingMode(null);
    }
  };

  const handleLaunchMode = async (mode: StudyMode) => {
    if (!selectedLesson) return;
    soundService.playClick();
    setIsGenerating(true);
    const modeName = modes.find(m => m.id === mode)?.label || 'Study Session';
    setGeneratingMode(modeName);
    try {
      const session = await generateModeSession(selectedLesson, mode, {
        name: stats.name || 'Scholar',
        level: stats.level.toString(),
      });
      onLaunchSession(session);
    } catch (err: any) { 
      setGenerationError(err.message || 'Failed to forge study session. Please retry.'); 
    } finally { 
      setIsGenerating(false); 
      setGeneratingMode(null);
    }
  };

  const modes: { id: StudyMode; icon: any; label: string; desc: string; sub: string; color: string; hoverBorder: string; accent: string; badgeBg: string }[] = [
    { 
      id: 'normal_study', 
      icon: Layers, 
      label: 'Normal Study', 
      desc: 'Standard pedagogical balance of retrieval & explanation.', 
      sub: 'Balanced Pacing', 
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', 
      hoverBorder: 'hover:border-emerald-500/40 hover:bg-emerald-500/15 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      accent: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
    },
    { 
      id: 'quick_review', 
      icon: Zap, 
      label: 'Quick Review', 
      desc: 'Highest-yield facts and retention hooks optimized for 5-minute sprints.', 
      sub: 'High Yield (5m)', 
      color: 'bg-amber-500/10 border-amber-500/20 text-amber-400', 
      hoverBorder: 'hover:border-amber-500/40 hover:bg-amber-500/15 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      accent: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/25 text-amber-400'
    },
    { 
      id: 'detailed_mastery', 
      icon: Brain, 
      label: 'Detailed Mastery', 
      desc: 'Deep causal explanations and advanced concepts for top grade depth.', 
      sub: 'A* Depth', 
      color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', 
      hoverBorder: 'hover:border-blue-500/40 hover:bg-blue-500/15 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      accent: 'text-blue-400',
      badgeBg: 'bg-blue-500/10 border-blue-500/25 text-blue-400'
    },
    { 
      id: 'test_prep', 
      icon: Target, 
      label: 'Test Prep', 
      desc: 'Strict exam-style scenarios, rigorous option testing and model structures.', 
      sub: 'Exam Simulation', 
      color: 'bg-rose-500/10 border-rose-500/20 text-rose-400', 
      hoverBorder: 'hover:border-rose-500/40 hover:bg-rose-500/15 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]',
      accent: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/25 text-rose-400'
    },
    { 
      id: 'eli5', 
      icon: Baby, 
      label: 'ELI5 Mode', 
      desc: 'Complicated topics broken down into ultra-simple, intuitive stories.', 
      sub: 'Simplicity Rules', 
      color: 'bg-purple-500/10 border-purple-500/20 text-purple-400', 
      hoverBorder: 'hover:border-purple-500/40 hover:bg-purple-500/15 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]',
      accent: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/25 text-purple-400'
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-6 bg-slate-950 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-slate-950 border border-slate-900 rounded-none md:rounded-3xl w-full h-full md:h-[92vh] max-w-7xl overflow-hidden flex flex-col shadow-2xl relative"
      >
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-forge-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/3 rounded-full blur-[100px] pointer-events-none" />

        {/* Global Header */}
        <div className="px-8 py-5 border-b border-slate-900 flex justify-between items-center shrink-0 bg-slate-950/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Study Center <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-orange-400 font-mono">NEURAL DECK v2.4</span>
              </h1>
              <p className="text-xs text-slate-400">Launch adaptive AI modes and rigorous exam simulators tailored to your knowledge maps</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              soundService.playClick();
              onClose();
            }} 
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
          >
            <X className="w-4 h-4" />
            <span>Close Lessons</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-hidden flex z-10">
          
          {/* Left Panel - Audits Search & Select */}
          <div className="w-[32%] border-r border-slate-900 flex flex-col bg-slate-950/40 shrink-0">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-900 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter neural audits..."
                  className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/5 focus:border-orange-500/40 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] metallic-scrollbar">
              {filteredLessons.length > 0 ? (
                filteredLessons.map(l => {
                  const isSelected = selectedLesson?.id === l.id;
                  return (
                    <button 
                      key={l.id} 
                      className={cn(
                        "w-full text-left p-5 transition-all flex flex-col gap-2 relative border-l-4",
                        isSelected 
                          ? "bg-gradient-to-r from-orange-500/5 to-transparent border-orange-500 text-white" 
                          : "hover:bg-white/[0.01] border-transparent text-slate-400 hover:text-slate-200"
                      )} 
                      onClick={() => {
                        setSelectedLesson(l);
                        setGenerationError(null);
                        soundService.playClick();
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                          {l.audit_metadata.level_detected}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(l.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-bold text-sm tracking-tight leading-tight line-clamp-1">{l.audit_metadata.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="line-clamp-1 flex-1">{l.audit_metadata.subject}</span>
                        <span>•</span>
                        <span className="shrink-0 font-mono text-orange-300">{(l.semantic_map?.concept_hierarchy || []).reduce((acc, tier) => acc + (tier.concepts || []).length, 0)} core keys</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  No matching audits found.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Control Center / Sandbox */}
          <div className="flex-1 overflow-y-auto metallic-scrollbar bg-slate-900/10 relative p-8">
            <AnimatePresence mode="wait">
              {selectedLesson ? (
                <motion.div 
                  key={selectedLesson.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {/* Top Header Card */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">
                        {selectedLesson.audit_metadata.subject}
                      </span>
                      <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Audited Knowledge
                      </span>
                    </div>

                    <h2 className="text-3xl font-extrabold text-white tracking-tight">{selectedLesson.audit_metadata.title}</h2>

                    {/* Telemetry Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <Gauge className="w-3 h-3 text-emerald-400" /> Density Score
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                          {selectedLesson.audit_metadata.academic_density_score || 78}<span className="text-xs font-normal text-slate-500">%</span>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <Star className="w-3 h-3 text-amber-400" /> Relevance
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                          {selectedLesson.audit_metadata.exam_relevance_score || 85}<span className="text-xs font-normal text-slate-500">/100</span>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <Clock className="w-3 h-3 text-blue-400" /> Mastery Hours
                        </span>
                        <div className="text-lg font-bold text-white flex items-baseline gap-1">
                          {selectedLesson.audit_metadata.estimated_mastery_hours || 4}<span className="text-xs font-normal text-slate-400"> hrs</span>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <BookMarked className="w-3 h-3 text-rose-400" /> Syllabus Keys
                        </span>
                        <div className="text-lg font-bold text-white">
                          {(selectedLesson.semantic_map?.concept_hierarchy || []).reduce((acc, tier) => acc + (tier.concepts || []).length, 0) || 8}
                        </div>
                      </div>
                    </div>

                    {/* Central Thesis Overview */}
                    {selectedLesson.semantic_map?.central_thesis && (
                      <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
                        <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">CENTRAL COGNITIVE THESIS</h4>
                        <p className="text-sm text-slate-300 italic leading-relaxed font-medium">"{selectedLesson.semantic_map.central_thesis}"</p>
                      </div>
                    )}
                  </div>

                  {/* Primary Feature: AI Exam Simulator */}
                  <div className="glass-card p-6 rounded-2xl border border-orange-500/10 bg-gradient-to-br from-orange-500/[0.03] to-transparent relative group">
                    <div className="absolute top-4 right-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      🔥 MAIN ENGINE
                    </div>
                    <div className="max-w-xl space-y-2">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-orange-400 animate-pulse" />
                        AI Exam Simulator
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Compiles a rigorous mock paper under real timer settings mimicking strict board rubrics. Adapts directly to detected prerequisite strengths and syllabus vulnerabilities.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-4">
                      <button
                        onClick={handleLaunchExam}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        Begin Exam Prep
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="text-[10px] font-mono text-slate-500">
                        ⚡ Core XP Gain: +250 XP • Recharts active student metrics
                      </div>
                    </div>
                  </div>

                  {/* Action 2 Grid: Study Forge Modes */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">Select Neural Forge Study Mode</h3>
                      <div className="h-px bg-slate-900 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modes.map(m => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleLaunchMode(m.id)}
                            disabled={isGenerating}
                            className={cn(
                              "w-full text-left p-5 rounded-2xl border border-white/5 bg-white/[0.01] transition-all duration-300 flex flex-col justify-between gap-4 select-none relative group/card",
                              m.hoverBorder,
                              isGenerating && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-start justify-between w-full">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2.5 rounded-xl flex items-center justify-center", m.badgeBg)}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-white tracking-tight group-hover/card:text-orange-400 transition-colors">{m.label}</h4>
                                  <span className="text-[10px] text-slate-400 font-medium">{m.sub}</span>
                                </div>
                              </div>
                              <div className="p-1 rounded-full opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-1 transition-all">
                                <ArrowRight className="w-4 h-4 text-orange-400" />
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">System Ready</h3>
                  <p className="text-slate-400 text-xs max-w-sm mt-1">
                    Select a cognitive audit file from the sidebar list to initiate interactive Study Forge engine modules.
                  </p>
                </div>
              )}
            </AnimatePresence>

            {/* ERROR DISPLAY */}
            <AnimatePresence>
              {generationError && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute bottom-6 left-6 right-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex justify-between items-center shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                  <button 
                    onClick={() => setGenerationError(null)} 
                    className="p-1 hover:bg-white/5 rounded-lg text-rose-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HIGH FIDELITY scan/compile progress indicator overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="relative mb-6">
                    {/* Ring Spinners */}
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-orange-500/20 animate-spin-slow" />
                    <div className="absolute inset-2 rounded-full border-2 border-orange-500/40 border-t-orange-500 animate-spin" />
                    <div className="absolute inset-4 rounded-full border border-orange-500/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="text-md font-bold text-white tracking-tight">AI Forge In Progress</h3>
                    <p className="text-xs text-orange-400 font-mono tracking-wider">COMPILING: {generatingMode?.toUpperCase()}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-mono pt-4 animate-pulse">
                      Analyzing cognitive blueprints & structuring interactive parameters...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
