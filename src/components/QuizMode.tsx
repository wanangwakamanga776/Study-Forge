import React, { useState } from 'react';
import { Plus, Trash2, ChevronLeft, BrainCircuit, CheckCircle2, XCircle, Trophy, Flame, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Quiz, QuizQuestion } from '../types';
import { XP_PER_QUIZ_QUESTION } from '../constants';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { generateId } from '../lib/utils';
import { useForgeEngine } from '../hooks/useForgeEngine';
import { useRewards } from './RewardToast';

import { useForgeStore } from '../contexts/ForgeStoreContext';

interface QuizModeProps {
  quizzes: Quiz[];
  onUpdate: (quizzes: Quiz[]) => void;
  onComplete: (xp: number) => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ quizzes, onUpdate, onComplete }) => {
  const { trackQuestProgress } = useForgeStore();
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const { awardStudySession } = useForgeEngine();
  const { triggerReward } = useRewards();
  const [isCreating, setIsCreating] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

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
    if (index === activeQuiz!.questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
      soundService.playSuccess();
    } else {
      soundService.playError();
    }
  };

  const nextQuestion = () => {
    soundService.playClick();
    if (currentQuestionIndex < activeQuiz!.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      const finalScore = Math.round((score / activeQuiz!.questions.length) * 100);
      
      if (finalScore === 100) {
        trackQuestProgress('quiz_master', 1);
      }

      const { xpGain, embersGain } = awardStudySession(finalScore, 100, 10);
      triggerReward(xpGain, embersGain, "Evaluation Complete!");
      onComplete(xpGain);
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
  };

  if (activeQuiz) {
    if (showResults) {
      const percentage = Math.round((score / activeQuiz.questions.length) * 100);
      return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md mx-auto text-center p-12 glass-card rounded-[2.5rem] border border-forge-accent/20 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-accent to-yellow-400" />
          <div className="w-20 h-20 bg-forge-accent/10 text-forge-accent rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Trophy size={40} />
          </div>
          <h2 className="text-3xl font-display font-black text-white uppercase italic tracking-tighter mb-2">Study Results</h2>
          <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mb-8">Score Achieved: {percentage}%</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">XP Earned</p>
                <div className="flex items-center justify-center gap-1">
                    <Star size={14} className="text-forge-accent fill-current" />
                    <p className="text-2xl font-black text-white">+{Math.round(100 * (1 + percentage / 100))}</p>
                </div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">Embers Earned</p>
                <div className="flex items-center justify-center gap-1">
                    <Flame size={14} className="text-orange-500 fill-current" />
                    <p className="text-2xl font-black text-white">+{Math.round(10 * (1 + percentage / 100))}</p>
                </div>
            </div>
          </div>

          <button
            onClick={resetQuiz}
            className="w-full py-4 forge-gradient text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform"
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
            <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">{quiz.questions.length} Questions</p>
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
