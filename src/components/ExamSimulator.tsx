import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, AlertTriangle, ChevronRight, CheckCircle2, XCircle, Brain, Target, ArrowRight, Loader2, Sparkles, ScrollText, AlertCircle, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Quiz, ExamAttempt, ExamSimulatorOutput, ForgeRevisionPlan, LessonArchitectAudit } from '../types';
import { cn, generateId } from '../lib/utils';
import { soundService } from '../services/soundService';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { useAppState } from '../hooks/useAppState';

interface ExamSimulatorProps {
  exam: ExamSimulatorOutput['exam'];
  auditData: LessonArchitectAudit;
  onComplete: (attempt: any) => void;
  onClose: () => void;
  onAddRevisionPlan?: (plan: ForgeRevisionPlan) => void;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ exam, auditData, onComplete, onClose, onAddRevisionPlan }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState((exam.time_limit_minutes || 15) * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [revisionPlan, setRevisionPlan] = useState<ForgeRevisionPlan | null>(null);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { awardXP, trackQuestProgress } = useForgeStore();
  const { state } = useAppState();

  const allQuestions = exam.sections.flatMap(s => s.questions);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const finishExam = () => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    trackQuestProgress('exam_completed', 1);
    soundService.playSuccess();
  };

  const generateRevisionPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const { generateExamSimulatorAction } = await import('../services/aiService');
      
      const studentAnswers = allQuestions.map(q => ({
        question_id: q.question_id,
        answer: answers[q.question_id] || "No answer provided",
        time_spent_seconds: 0, // Could be tracked per question
        flagged_for_review: false
      }));

      const plan = await generateExamSimulatorAction('forge_revision_plan', {
        student_context: {
          name: state.stats.name || 'Student',
          level: state.stats.level > 10 ? 'university' : 'a_level',
          exam_board_style: exam.exam_board_style,
          weak_topics: [],
          strong_topics: [],
          srs_mature_topics: [],
          previous_exam_scores: [],
          days_until_real_exam: 30
        },
        audit_data: auditData,
        student_answers: studentAnswers,
        generated_exam: exam
      }) as ForgeRevisionPlan;

      setRevisionPlan(plan);
      onAddRevisionPlan?.(plan);
      awardXP(plan.results.total_marks_awarded * 10 + 100);
      soundService.playSuccess();
    } catch (error) {
      console.error("Revision plan generation failed:", error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const generateFeedback = (score: number, total: number) => {
    const ratio = score / total;
    if (ratio === 1) return "Flawless victory! You are ready for the real thing.";
    if (ratio > 0.8) return "Excellent performance. A few minor gaps to bridge.";
    if (ratio > 0.6) return "Good steady progress. You've mastered the core, but the details need polish.";
    return "The Forge demands more. Revisit the foundation and try the 10-min crash course.";
  };

  const calculatePrediction = (score: number, total: number, duration: number, limit: number) => {
    const scoreWeight = 0.8;
    const timeWeight = 0.2;
    const limitSec = limit * 60;
    
    const scorePerc = (score / total) * 100;
    const timePerc = Math.max(0, (limitSec - duration) / limitSec) * 100;
    
    return Math.round(scorePerc * scoreWeight + timePerc * timeWeight);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-12">
        <AnimatePresence mode="wait">
          {!revisionPlan ? (
            <motion.div 
              key="results-initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-[3rem] p-12 text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-forge-accent/20 text-forge-accent flex items-center justify-center mx-auto mb-8 forge-glow-pulse">
                <ScrollText size={48} />
              </div>
              
              <h2 className="text-4xl font-extrabold text-white mb-2 uppercase italic tracking-tighter">Exam Submitted</h2>
              <p className="text-stone-400 mb-8 max-w-md mx-auto">
                Your paper has been sent to the Grading System. We will now perform an analysis of your answers to building your custom Study Plan.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-12 text-left max-w-lg mx-auto">
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">Paper Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Total Marks</span>
                    <span className="text-white font-bold">{exam.total_marks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Time Used</span>
                    <span className="text-white font-bold">{formatTime((exam.time_limit_minutes * 60) - timeLeft)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Questions Answered</span>
                    <span className="text-white font-bold">{Object.keys(answers).length} / {allQuestions.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={onClose}
                  className="px-8 py-4 bg-white/5 border border-white/10 text-stone-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                >
                  Exit Dashboard
                </button>
                <button 
                  disabled={isGeneratingPlan}
                  onClick={generateRevisionPlan}
                  className="px-10 py-4 bg-forge-accent text-forge-dark rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all forge-glow disabled:opacity-50 flex items-center justify-center gap-2 min-w-[240px]"
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Grading Paper...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Grade test
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="revision-plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Performance Summary */}
              <div className="glass-card rounded-[3rem] overflow-hidden">
                <div className="p-8 md:p-12 border-b border-white/5 bg-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        revisionPlan.results.performance_tier === 'distinction' ? "bg-emerald-500/20 text-emerald-400" :
                        revisionPlan.results.performance_tier === 'strong_pass' ? "bg-blue-500/20 text-blue-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {revisionPlan.results.performance_tier.replace('_', ' ')}
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Grade: {revisionPlan.results.grade}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Total Marks</p>
                      <p className="text-3xl font-black text-white italic tracking-tighter">
                        {revisionPlan.results.total_marks_awarded} / {revisionPlan.results.total_marks_available}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-white mb-4 italic tracking-tighter uppercase">{revisionPlan.forge_revision_plan.plan_title}</h3>
                  <p className="text-stone-400 text-sm leading-relaxed mb-8 max-w-2xl">{revisionPlan.forge_revision_plan.plan_summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-forge-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Grade Prediction</span>
                      </div>
                      <p className="text-xs text-white leading-relaxed">{revisionPlan.results.grade_prediction}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-stone-900 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-red-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">One Thing to Fix</span>
                      </div>
                      <p className="text-xs text-stone-200 leading-relaxed font-bold">{revisionPlan.encouragement.next_step}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-12">
                  {/* Detailed Question Marking */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-6 flex items-center gap-2">
                       <CheckCircle2 size={12} className="text-emerald-400" /> Answer Analysis
                    </h4>
                    <div className="space-y-6">
                      {revisionPlan.question_marking.map((mark, i) => {
                        const question = allQuestions.find(q => q.question_id === mark.question_id);
                        return (
                          <div key={i} className="p-8 rounded-[2.5rem] bg-stone-900/50 border border-white/5 relative overflow-hidden">
                             <div className={cn(
                               "absolute top-0 right-0 px-4 py-2 text-[10px] font-black uppercase tracking-widest",
                               mark.marks_awarded === mark.marks_available ? "bg-emerald-500/20 text-emerald-400" : 
                               mark.marks_awarded > 0 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                             )}>
                               {mark.marks_awarded} / {mark.marks_available} Marks
                             </div>
                             
                             <div className="mb-6">
                               <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Question {i + 1}</p>
                               <h5 className="text-lg font-bold text-white leading-relaxed">
                                 {question?.question_text || "Question text not found"}
                               </h5>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Your Response</p>
                                  <div className="p-4 bg-white/5 rounded-2xl text-sm text-stone-300 border border-white/5 italic">
                                    {mark.student_answer_summary || "No response provided."}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-black text-forge-accent uppercase tracking-widest">Mark Scheme Analysis</p>
                                  <div className="p-4 bg-forge-accent/5 rounded-2xl text-sm text-forge-accent border border-forge-accent/10">
                                    <p className="font-bold mb-1">Feedback:</p>
                                    <p className="text-stone-300">{mark.what_they_got_right}</p>
                                    {mark.what_was_missing && (
                                      <>
                                        <p className="font-bold mt-2 text-red-400">Missing/Incorrect:</p>
                                        <p className="text-stone-300">{mark.what_was_missing}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                             </div>

                             <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-2">Model Answer / Explanation</p>
                                <div className="text-sm text-stone-400 leading-relaxed markdown-content">
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{mark.the_correct_answer}</ReactMarkdown>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Remediation Order */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-6 flex items-center gap-2">
                       <ScrollText size={12} /> Topics to Study
                    </h4>
                    <div className="space-y-4">
                      {revisionPlan.forge_revision_plan.topic_remediation_order.map((topic, i) => (
                        <div key={i} className="group p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-forge-accent/30 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-black text-forge-accent">0{topic.priority}</span>
                                 <h5 className="font-bold text-white uppercase tracking-tight">{topic.topic}</h5>
                               </div>
                               <p className="text-xs text-stone-400">{topic.specific_gap}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-red-400 mb-1">-{topic.marks_lost_on_this_topic} Marks</p>
                              <p className="text-[10px] font-bold text-stone-500">{topic.time_needed_minutes}m required</p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-stone-300 italic">Action: {topic.action}</p>
                            <div className="flex items-center gap-1 text-[10px] font-black text-stone-500 uppercase">
                              <CheckCircle2 size={10} />
                              {topic.success_indicator}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crash Course Cards */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-6 flex items-center gap-2">
                      <Sparkles size={12} className="text-forge-accent" /> High-Intensity Quick Review
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {revisionPlan.forge_revision_plan.crash_course_flashcard_deck.map((card, i) => (
                        <div key={i} className="p-6 rounded-[2rem] bg-forge-accent/5 border border-forge-accent/10">
                           <div className="flex items-center justify-between mb-4">
                             <div className="px-2 py-0.5 rounded bg-forge-accent text-forge-dark text-[8px] font-black uppercase">
                               {card.card_type}
                             </div>
                             <span className={cn(
                               "text-[8px] font-black uppercase tracking-widest",
                               card.urgency === 'must_know_before_exam' ? "text-red-400" : "text-forge-accent"
                             )}>
                               {card.urgency.replace(/_/g, ' ')}
                             </span>
                           </div>
                           <h6 className="text-sm font-bold text-white mb-2">{card.front}</h6>
                           <p className="text-xs text-stone-400 line-clamp-2 italic">Targets: {card.why_this_card_was_created}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12 bg-white/5 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={onClose}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-stone-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                    >
                      Close Report
                    </button>
                    <button
                      onClick={() => {
                        // In a real app we'd save this to state
                        onClose();
                      }}
                      className="flex-1 py-4 bg-white text-stone-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      Save Plan & Start Crash Course
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency Brief */}
              <div className="p-10 rounded-[3rem] bg-forge-accent text-forge-dark">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle size={24} />
                  <h4 className="text-xl font-black italic uppercase tracking-tighter">10-Minute Emergency Brief</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {revisionPlan.forge_revision_plan.ten_minute_emergency_brief.critical_facts.map((fact, i) => (
                    <div key={i} className="space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{fact.topic}</p>
                       <p className="text-sm font-bold">{fact.the_one_thing}</p>
                       <div className="p-3 bg-white/20 rounded-xl border border-white/10">
                         <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Avoid the Trap</p>
                         <p className="text-xs font-medium">{fact.trap_to_avoid}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!allQuestions || allQuestions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-20 text-center">
        <div className="glass-card rounded-[3rem] p-12">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">No Questions Available</h2>
          <p className="text-stone-400 mb-8">This exam doesn't have any questions yet.</p>
          <button onClick={onClose} className="px-8 py-3 bg-white text-stone-900 rounded-xl font-bold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentSection = exam.sections[currentSectionIndex];
  const currentQuestion = currentSection.questions[currentQuestionIndex];
  const totalQuestions = allQuestions.length;
  const currentQuestionGlobalIndex = exam.sections.slice(0, currentSectionIndex).reduce((acc, s) => acc + s.questions.length, 0) + currentQuestionIndex + 1;

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-4 py-20 text-center">
        <div className="glass-card rounded-[3rem] p-12">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Question Not Found</h2>
          <p className="text-stone-400 mb-8">We couldn't find the requested question.</p>
          <button onClick={onClose} className="px-8 py-3 bg-white text-stone-900 rounded-xl font-bold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < exam.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      finishExam();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      setCurrentQuestionIndex(exam.sections[currentSectionIndex - 1].questions.length - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-full flex flex-col py-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
             <Timer size={18} className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-stone-400'} />
             <span className={cn(
               "text-xl font-black italic tracking-tighter font-mono",
               timeLeft < 60 ? 'text-red-500' : 'text-white'
             )}>
               {formatTime(timeLeft)}
             </span>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Section: {currentSection.section_title}</p>
            <p className="text-white font-black italic tracking-tighter">{currentQuestionGlobalIndex} / {totalQuestions}</p>
          </div>
        </div>
        
        <button 
          onClick={finishExam}
          className="px-6 py-3 bg-white/5 border border-white/10 text-stone-400 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
        >
          Submit Paper
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.question_id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {currentSection.section_instructions && currentQuestionIndex === 0 && (
              <div className="p-6 bg-forge-accent/10 border border-forge-accent/20 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-forge-accent mb-2">Section Instructions</p>
                <p className="text-xs text-stone-300 italic">{currentSection.section_instructions}</p>
              </div>
            )}

            <div className="glass-card rounded-[2.5rem] p-10 md:p-14">
              <div className="flex items-center justify-between mb-8">
                <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-stone-500">
                  {currentQuestion.type.replace('_', ' ')}
                </div>
                <span className="text-[10px] font-black text-forge-accent uppercase">{currentQuestion.marks} Marks</span>
              </div>

              {currentQuestion.supporting_material && (
                <div className="mb-8 p-6 bg-stone-900 border border-white/5 rounded-2xl prose prose-invert prose-sm max-w-none">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-4 flex items-center gap-2">
                    <Bookmark size={10} /> Supporting Material
                  </p>
                  <div className="text-stone-300 text-sm leading-relaxed markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.supporting_material}</ReactMarkdown>
                  </div>
                </div>
              )}

              <h3 className="text-xl md:text-2xl font-bold text-white mb-10 leading-relaxed markdown-content">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.question_text}</ReactMarkdown>
              </h3>

              {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                <div className="space-y-4">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: option }));
                        soundService.playClick();
                      }}
                      className={cn(
                        "w-full p-6 text-left rounded-[1.5rem] border transition-all duration-300 group flex items-start gap-4",
                        answers[currentQuestion.question_id] === option 
                          ? "bg-white text-forge-dark border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-[1.02]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-stone-300 hover:text-white premium-card-hover"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5",
                        answers[currentQuestion.question_id] === option ? "border-forge-dark bg-forge-dark/10" : "border-stone-700"
                      )}>
                        {answers[currentQuestion.question_id] === option && <CheckCircle2 size={14} />}
                      </div>
                      <div className="font-bold text-sm md:text-base markdown-content prose-sm">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{option}</ReactMarkdown>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Your Answer</p>
                   <textarea
                    value={answers[currentQuestion.question_id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: e.target.value }))}
                    placeholder="Enter your detailed response here..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl p-6 text-white placeholder:text-stone-600 focus:outline-none focus:border-forge-accent/50 transition-all font-medium leading-relaxed"
                   />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="py-8 flex items-center justify-between border-t border-white/5">
         <button
           disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
           onClick={handlePrev}
           className="px-8 py-4 bg-white/5 border border-white/10 text-stone-500 hover:text-white disabled:opacity-0 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
         >
           Previous Question
         </button>

         <button
           onClick={handleNext}
           className="px-10 py-4 bg-white text-forge-dark rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all flex items-center gap-2"
         >
           {currentQuestionIndex < currentSection.questions.length - 1 || currentSectionIndex < exam.sections.length - 1 ? (
             <>Next Question <ChevronRight size={16} /></>
           ) : (
             <>Finalize Submission <ChevronRight size={16} /></>
           )}
         </button>
      </div>
    </div>
  );
};

export default ExamSimulator;
