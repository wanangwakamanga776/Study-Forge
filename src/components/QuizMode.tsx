import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft, BrainCircuit, CheckCircle2, XCircle, Trophy, Flame, Star, ShieldCheck, History, Clock, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Quiz, QuizQuestion, ForgeRevisionPlan } from '../types';
import { XP_PER_QUIZ_QUESTION } from '../constants';
import { cn, getGrade } from '../lib/utils';
import { soundService } from '../services/soundService';
import { generateId } from '../lib/utils';
import { useForgeEngine } from '../hooks/useForgeEngine';
import { useRewards } from './RewardToast';

import { useForgeStore } from '../contexts/ForgeStoreContext';
import { PyraMascot } from './PyraMascot';
import { HelpModal } from './HelpModal';
import { PowerUpPanel } from './PowerUpPanel';

interface QuizModeProps {
  quizzes: Quiz[];
  onUpdate: (quizzes: Quiz[]) => void;
  onComplete: (xp: number) => void;
  onStartExam?: (quiz: Quiz) => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ quizzes, onUpdate, onComplete, onStartExam }) => {
  const { trackQuestProgress, processSessionCompletion } = useForgeStore();
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { awardStudySession } = useForgeEngine();
  const { triggerReward } = useRewards();
  const [isCreating, setIsCreating] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [freeAnswer, setFreeAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [detailedResults, setDetailedResults] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [suggestedPowerUpId, setSuggestedPowerUpId] = useState<string | undefined>(undefined);

  const activeQuiz = quizzes.find(q => q.id === activeQuizId);

  const createQuiz = () => {
    if (!newQuizTitle.trim()) return;
    const newQuiz: Quiz = {
      id: generateId(),
      title: newQuizTitle,
      questions: [],
    };
    onUpdate([...quizzes, newQuiz]);
    setNewQuizTitle('');
    setIsCreating(false);
    setActiveQuizId(newQuiz.id);
  };

  const addQuestion = (question: string, options: string[], correctAnswer: number) => {
    if (!activeQuiz) return;
    const newQ: QuizQuestion = {
      id: generateId(),
      question,
      options,
      correctAnswer,
    };
    const updated = quizzes.map(q => 
      q.id === activeQuizId ? { ...q, questions: [...q.questions, newQ] } : q
    );
    onUpdate(updated);
  };

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    if (!activeQuiz) return;
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    if (index === currentQ.correctAnswer) {
      setScore(prev => prev + 1);
      soundService.playSuccess();
      setSuggestedPowerUpId(undefined);
    } else {
      soundService.playError();
      setSuggestedPowerUpId('temporal_splice');
    }
    
    setDetailedResults(prev => [...prev, {
      questionId: currentQ.id,
      question: currentQ.question,
      studentAnswer: currentQ.options?.[index] || 'No answer',
      isCorrect: index === currentQ.correctAnswer,
      correctAnswer: currentQ.options?.[currentQ.correctAnswer!] || '',
      explanation: currentQ.explanation
    }]);
  };

  const handleFreeResponseSubmit = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    if (!activeQuiz) return;
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    
    // For free response, marking is done at the end by AI for better feedback
    // but we can provide an initial "submitted" state
    setDetailedResults(prev => [...prev, {
      questionId: currentQ.id,
      question: currentQ.question,
      studentAnswer: freeAnswer,
      type: currentQ.type,
      marksAvailable: currentQ.marks || 1
    }]);
    soundService.playClick();
  };

  const nextQuestion = async () => {
    soundService.playClick();
    if (!activeQuiz) return;
    
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setFreeAnswer('');
      setIsAnswered(false);
      setSuggestedPowerUpId(undefined);
    } else {
      setIsGrading(true);
      setShowResults(true);

      try {
        if (activeQuiz.isAIGraded) {
          const { generateExamSimulatorAction } = await import('../services/aiService');
          
          // Use the exam grading engine for high-quality quiz feedback
          const gradingResult = await generateExamSimulatorAction('forge_revision_plan', {
            student_context: {
              name: 'Student',
              level: 'a_level',
              exam_board_style: 'AQA',
              weak_topics: [],
              strong_topics: [],
              srs_mature_topics: [],
              previous_exam_scores: [],
              days_until_real_exam: 30
            },
            audit_data: { 
              audit_metadata: { title: activeQuiz.title, subject: 'General', level_detected: 'standard', content_type: 'quiz', word_count: 0, academic_density_score: 0, exam_relevance_score: 0, estimated_mastery_hours: 0, prerequisite_knowledge: [] },
              application_layer: {
                exam_questions: activeQuiz.questions.map(q => ({
                  question_id: q.id,
                  question: q.question,
                  type: q.type || 'mcq',
                  marks: q.marks || 1,
                  options: q.options || [],
                  correct_answer: q.type === 'mcq' ? (q.options?.[q.correctAnswer!] || '') : (q.correctAnswerText || ''),
                  mark_scheme: q.explanation || '',
                  difficulty: 'medium',
                  topic_tag: 'topic',
                  tier: 1,
                  cognitive_demand: 'recall',
                  model_answer: q.correctAnswerText || '',
                  common_wrong_answers: [],
                  examiner_note: q.explanation || ''
                }))
              }
            } as any,
            student_answers: detailedResults.map(r => ({
              question_id: r.questionId,
              answer: r.studentAnswer
            })),
            generated_exam: {
              exam_id: activeQuiz.id,
              title: activeQuiz.title,
              total_marks: activeQuiz.questions.reduce((acc, q) => acc + (q.marks || 1), 0),
              sections: [{
                section_id: 's1',
                section_title: 'Main Section',
                section_instructions: '',
                marks_available: activeQuiz.questions.reduce((acc, q) => acc + (q.marks || 1), 0),
                time_recommendation_minutes: 10,
                questions: activeQuiz.questions.map(q => ({
                  question_id: q.id,
                  type: q.type || 'mcq',
                  marks: q.marks || 1,
                  question_text: q.question,
                  options: q.options,
                  topic_tag: 'topic',
                  targets_weak_area: false,
                  is_trick_question: false,
                  cognitive_demand: 'recall',
                  HIDDEN_correct_answer: q.type === 'mcq' ? (q.options?.[q.correctAnswer!] || '') : (q.correctAnswerText || ''),
                  HIDDEN_mark_scheme: q.explanation || q.markingCriteria || 'Grade based on accuracy',
                  HIDDEN_model_answer: q.correctAnswerText || '',
                  HIDDEN_common_mistakes: [],
                  HIDDEN_examiner_tip: ''
                }))
              }]
            } as any
          }) as ForgeRevisionPlan;

          const finalScore = gradingResult.results.percentage;
          setScore(gradingResult.results.total_marks_awarded);
          setDetailedResults(gradingResult.question_marking.map(m => ({
            questionId: m.question_id,
            marksAwarded: m.marks_awarded,
            marksAvailable: m.marks_available,
            studentAnswer: m.student_answer_summary,
            feedback: m.what_they_got_right,
            missing: m.what_was_missing,
            correctAnswer: m.the_correct_answer
          })));

          if (finalScore === 100) {
            trackQuestProgress('quiz_master', 1);
          }

          const earningsRes = await processSessionCompletion({
            session_type: 'exam_completed',
            exam_score_percent: finalScore,
            session_duration_minutes: 5,
            streak_continued: true
          });
          setEarnings(earningsRes);
          onComplete(earningsRes.embers_earned.total_earned * 5);
        } else {
          // Standard MCQ only quiz
          const finalScore = Math.round((score / activeQuiz.questions.length) * 100);
          if (finalScore === 100) trackQuestProgress('quiz_master', 1);
          
          const earningsRes = await processSessionCompletion({
            session_type: 'exam_completed',
            exam_score_percent: finalScore,
            session_duration_minutes: 5,
            streak_continued: true
          });
          setEarnings(earningsRes);
          onComplete(earningsRes.embers_earned.total_earned * 5);
        }
      } catch (err) {
        console.error("Grading failed:", err);
      } finally {
        setIsGrading(false);
      }
    }
  };

  const resetQuiz = () => {
    soundService.playClick();
    setActiveQuizId(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowResults(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setSuggestedPowerUpId(undefined);
  };

  if (activeQuiz) {
    if (showResults) {
      const totalMarksAvailable = activeQuiz.isAIGraded ? activeQuiz.questions.reduce((acc, q) => acc + (q.marks || 1), 0) : activeQuiz.questions.length;
      const percentage = Math.round((score / totalMarksAvailable) * 100);
      const grade = getGrade(percentage);

      return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl mx-auto p-8"
        >
          <div className="glass-card rounded-[2.5rem] border border-forge-accent/20 shadow-2xl relative overflow-hidden p-12 text-center mb-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-accent to-yellow-400" />
            <PyraMascot 
              expression={percentage >= 80 ? 'excited' : 'happy'}
              message={isGrading ? 'AI is analyzing your performance...' : (percentage >= 80 ? 'Masterful performance!' : 'Evaluation complete.')}
              className="mb-6 mx-auto"
            />
            {isGrading ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <BrainCircuit size={48} className="text-forge-accent animate-pulse" />
                <p className="text-white font-bold italic tracking-tighter text-xl uppercase">Grading Paper...</p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-display font-black text-white uppercase italic tracking-tighter mb-2">Study Results</h2>
                <div className="flex justify-center items-center gap-4 mb-8">
                    <div className="text-center">
                        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Score</p>
                        <p className="text-2xl font-black text-white">{score} / {totalMarksAvailable}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Percentage</p>
                        <p className="text-2xl font-black text-white">{percentage}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Grade</p>
                        <p className="text-4xl font-black text-forge-accent">{grade}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">XP Earned</p>
                      <div className="flex items-center justify-center gap-1">
                          <Star size={14} className="text-forge-accent fill-current" />
                          <p className="text-2xl font-black text-white">+{earnings ? earnings.embers_earned.total_earned * 5 : '...'}</p>
                      </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">Embers Earned</p>
                      <div className="flex items-center justify-center gap-1">
                          <Flame size={14} className="text-orange-500 fill-current" />
                          <p className="text-2xl font-black text-white">+{earnings ? earnings.embers_earned.total_earned : '...'}</p>
                      </div>
                  </div>
                </div>
                
                {earnings && (
                  <div className="mb-8 p-4 bg-forge-accent/10 rounded-2xl border border-forge-accent/20">
                    <p className="text-xs font-medium text-forge-accent italic">{earnings.earn_message}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isGrading && detailedResults.length > 0 && (
            <div className="space-y-6 mb-8">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-2 px-4">
                 <History size={12} /> Detailed Feedback
               </h3>
               {detailedResults.map((res, i) => (
                 <div key={i} className="glass-card rounded-[2rem] p-8 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-stone-600 uppercase">Question {i + 1}</p>
                      {res.marksAwarded !== undefined ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                          res.marksAwarded === res.marksAvailable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {res.marksAwarded} / {res.marksAvailable} Marks
                        </span>
                      ) : (
                        res.isCorrect ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    <h4 className="text-white font-bold mb-4">{res.question}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-stone-600 uppercase">Your Answer</p>
                          <p className={cn("text-stone-300 italic", !res.isCorrect && res.marksAwarded === 0 && "text-red-400/70")}>{res.studentAnswer}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-forge-accent uppercase">Correct Answer / Feedback</p>
                          <p className="text-stone-300">{res.feedback || res.correctAnswer}</p>
                       </div>
                    </div>
                    {res.missing && (
                      <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[11px] text-red-400/80">
                         <strong>Missing:</strong> {res.missing}
                      </div>
                    )}
                 </div>
               ))}
            </div>
          )}

          <button
            disabled={isGrading}
            onClick={resetQuiz}
            className="w-full py-4 forge-gradient text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform disabled:opacity-50"
          >
            Return to Dashboard
          </button>
        </motion.div>
      );
    }

    const questions = activeQuiz.questions;
    if (questions.length === 0) {
      return (
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setActiveQuizId(null)} className="mb-6 flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-medium">
            <ChevronLeft size={18} /> Back
          </button>
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <p className="text-stone-400 mb-6">This quiz has no questions.</p>
            <AddQuestionForm onAdd={addQuestion} />
          </div>
        </div>
      );
    }

    const currentQ = questions[currentQuestionIndex];

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-stone-800">{activeQuiz.title}</h2>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">
            Question {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="mb-8 p-8 bg-white rounded-3xl border border-black/5 shadow-sm">
          <div className="text-lg font-medium text-stone-800 mb-8 markdown-content">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.question}</ReactMarkdown>
          </div>
          
          {(!currentQ.type || currentQ.type === 'mcq') && currentQ.options && currentQ.options.length > 0 ? (
            <div className="grid gap-3">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left transition-all border-2",
                    !isAnswered && "border-stone-100 hover:border-stone-200 hover:bg-stone-50",
                    isAnswered && idx === currentQ.correctAnswer && "border-emerald-500 bg-emerald-50 text-emerald-700",
                    isAnswered && selectedOption === idx && idx !== currentQ.correctAnswer && "border-red-500 bg-red-50 text-red-700",
                    isAnswered && selectedOption !== idx && idx !== currentQ.correctAnswer && "border-stone-100 opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="markdown-content prose-sm">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{option}</ReactMarkdown>
                    </div>
                    {isAnswered && idx === currentQ.correctAnswer && <CheckCircle2 size={20} />}
                    {isAnswered && selectedOption === idx && idx !== currentQ.correctAnswer && <XCircle size={20} />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                disabled={isAnswered}
                value={freeAnswer}
                onChange={(e) => setFreeAnswer(e.target.value)}
                placeholder="Type your response here..."
                className="w-full h-40 p-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-forge-accent/20 outline-none resize-none transition-all"
              />
              {!isAnswered && (
                <button
                  onClick={handleFreeResponseSubmit}
                  disabled={!freeAnswer.trim()}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  Submit Response
                </button>
              )}
            </div>
          )}
        </div>

        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {currentQ.explanation && (
              <div className="p-6 bg-forge-dark/50 border border-forge-accent/20 rounded-2xl">
                <p className="text-[10px] font-black text-forge-accent uppercase tracking-widest mb-2">Rationale (The Why)</p>
                <div className="text-sm text-stone-300 leading-relaxed markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.explanation}</ReactMarkdown>
                </div>
              </div>
            )}
            <button
              onClick={nextQuestion}
              className="w-full py-4 bg-white text-stone-900 rounded-2xl hover:bg-stone-100 transition-colors font-bold uppercase tracking-widest text-xs"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </button>
          </motion.div>
        )}

        <div className="fixed bottom-10 right-10 z-[110]">
          <PowerUpPanel 
            context={{
                card_front: currentQ?.question,
                their_wrong_answer: isAnswered && selectedOption !== null && selectedOption !== currentQ?.correctAnswer ? currentQ?.options[selectedOption] : undefined,
                topic: activeQuiz?.title,
                topic_tag: (currentQ as any)?.topic_tag
            }}
          />
        </div>

        <div className="mt-12">
          <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">Add More Questions</h3>
          <AddQuestionForm onAdd={addQuestion} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-extrabold font-display uppercase italic tracking-tighter text-white">Knowledge Lab</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            soundService.playClick();
          }}
          className="flex items-center gap-2 px-6 py-3 forge-gradient text-forge-dark rounded-xl hover:scale-105 transition-all font-display font-extrabold uppercase italic tracking-tighter forge-glow"
        >
          <Plus size={20} />
          New Quiz
        </button>
      </div>

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-8 glass-card rounded-[2.5rem]"
        >
          <div className="flex gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Quiz Title (e.g., Organic Chemistry)"
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-forge-accent/50 text-white font-bold"
            />
            <button
              onClick={createQuiz}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold uppercase tracking-widest text-xs"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 text-stone-500 hover:text-white font-bold uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {quizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setActiveQuizId(quiz.id)}
            className="group cursor-pointer p-8 glass-card rounded-[2rem] hover:border-forge-accent/50 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <BrainCircuit size={28} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(quizzes.filter(q => q.id !== quiz.id));
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-stone-600 hover:text-red-500 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{quiz.title}</h3>
            <p className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-6">{quiz.questions.length} Questions</p>
            
            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartExam?.(quiz);
                }}
                className="w-full py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={14} />
                Rigorous Exam
              </button>
              
              {quiz.examHistory && quiz.examHistory.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-[10px] text-stone-500 font-bold uppercase tracking-widest justify-center">
                  <History size={12} />
                  Best: {Math.max(...quiz.examHistory.map(h => h.score))}%
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AddQuestionForm: React.FC<{ onAdd: (q: string, o: string[], c: number) => void }> = ({ onAdd }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || options.some(o => !o.trim())) return;
    onAdd(question, options, correct);
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrect(0);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input
        type="text"
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="px-4 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-stone-200 text-sm"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              type="radio"
              name="correct"
              checked={correct === idx}
              onChange={() => setCorrect(idx)}
              className="w-4 h-4 text-stone-900 focus:ring-stone-900"
            />
            <input
              type="text"
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[idx] = e.target.value;
                setOptions(newOpts);
              }}
              className="flex-1 px-4 py-2 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-stone-200 text-xs"
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium text-sm"
      >
        Add Question
      </button>
    </form>
  );
};
