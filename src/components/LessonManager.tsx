import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Zap, Brain, Target, Baby, Layers,
  Clock, Star, ArrowRight, Loader2, CheckCircle2, FileText,
  Sparkles, AlertTriangle, X
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
  const [generationError, setGenerationError] = useState<string | null>(null);

  const sortedLessons = [...lessons].sort((a, b) => {
    const aTime = a.last_session_at || a.createdAt || 0;
    const bTime = b.last_session_at || b.createdAt || 0;
    return (bTime as number) - (aTime as number);
  });

  const handleLaunchExam = async () => {
    if (!selectedLesson) return;
    soundService.playClick();
    setIsGenerating(true);
    try {
      const response = await generateExamSimulatorAction('generate_exam', {
        student_context: { name: stats.name || 'Scholar', level: stats.level > 10 ? 'university' : 'a_level' },
        audit_data: selectedLesson,
      }) as ExamSimulatorOutput;
      onLaunchExam(response.exam, selectedLesson);
    } catch (err: any) { setGenerationError(err.message); } finally { setIsGenerating(false); }
  };

  const handleLaunchMode = async (mode: StudyMode) => {
    if (!selectedLesson) return;
    soundService.playClick();
    setIsGenerating(true);
    try {
      const session = await generateModeSession(selectedLesson, mode, {
        name: stats.name || 'Scholar',
        level: stats.level.toString(),
      });
      onLaunchSession(session);
    } catch (err: any) { setGenerationError(err.message); } finally { setIsGenerating(false); }
  };

  const modes: { id: StudyMode; icon: any; label: string; desc: string; sub: string; color: string; accent: string }[] = [
    { id: 'normal_study', icon: Layers, label: 'Normal Study', desc: 'Standard pedagogical balance.', sub: 'Balanced', color: 'bg-emerald-500/10 border-emerald-500/20', accent: 'text-emerald-400' },
    { id: 'quick_review', icon: Zap, label: 'Quick Review', desc: 'Highest-yield facts.', sub: '5 min', color: 'bg-amber-500/10 border-amber-500/20', accent: 'text-amber-400' },
    { id: 'detailed_mastery', icon: Brain, label: 'Detailed Mastery', desc: 'Deep dive.', sub: 'A* depth', color: 'bg-blue-500/10 border-blue-500/20', accent: 'text-blue-400' },
    { id: 'test_prep', icon: Target, label: 'Test Prep', desc: 'Exam conditions.', sub: 'Sim', color: 'bg-rose-500/10 border-rose-500/20', accent: 'text-rose-400' },
    { id: 'eli5', icon: Baby, label: 'ELI5 Mode', desc: 'Simple explanations.', sub: 'Easy', color: 'bg-purple-500/10 border-purple-500/20', accent: 'text-purple-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between shrink-0">
          <div className="text-white font-bold text-xl">Study Center</div>
          <button onClick={onClose} className="text-slate-400">Close</button>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <div className="w-[30%] border-r border-slate-800 overflow-y-auto">
             {sortedLessons.map(l => (
               <button key={l.id} className="w-full text-left p-4 hover:bg-slate-800 text-white" onClick={() => setSelectedLesson(l)}>
                 {l.audit_metadata.title}
               </button>
             ))}
          </div>
          <div className="flex-1 p-8 space-y-6">
            {selectedLesson && (
              <>
                <h2 className="text-2xl text-white font-bold">{selectedLesson.audit_metadata.title}</h2>
                <div className="space-y-2">
                  <button onClick={handleLaunchExam} className="w-full p-4 bg-forge-accent/20 text-white rounded-xl">AI Exam Simulator</button>
                  {modes.map(m => (
                    <button key={m.id} onClick={() => handleLaunchMode(m.id)} className={cn("w-full p-4 border rounded-xl text-white", m.color)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
