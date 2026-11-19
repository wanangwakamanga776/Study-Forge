import React, { useState } from 'react';
import { Brain, Swords, Clock, Target, CheckCircle2, RotateCcw, Flame, ShieldAlert, Award, FileQuestion } from 'lucide-react';
import { AppState } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { PracticeSession, PracticeQuestion } from '../components/practice/PracticeSession';

interface PracticePageProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onAward?: (xp: number) => void;
}

export function PracticePage({ state, onNavigate, onAward }: PracticePageProps) {
  const [activeMode, setActiveMode] = useState<'none' | 'flashcards' | 'quiz' | 'exam'>('none');

  if (activeMode === 'quiz') {
    const demoQuestions: PracticeQuestion[] = (state.decks?.[0]?.cards || []).slice(0, 5).map((c: any, i: number) => ({
      id: c.id || `q-${i}`,
      prompt: `What best defines or relates to: ${c.term || 'this concept'}?`,
      options: [
        c.definition || 'Correct definition',
        'An unrelated scientific concept',
        'An alternative mathematical model',
        'None of the above'
      ],
      answerIndex: 0,
      explanation: c.explanation || c.definition || 'Review the key concepts in your Forge.'
    }));

    const finalQuestions = demoQuestions.length > 0 ? demoQuestions : [
      {
        id: 'q-default-1',
        prompt: 'What is the primary benefit of active retrieval practice?',
        options: ['Strengthens memory pathways', 'Requires zero effort', 'Only works before exams', 'Replaces rest'],
        answerIndex: 0,
        explanation: 'Active retrieval forces the brain to reconstruct memory traces, enhancing long-term retention.'
      }
    ];

    return (
      <PracticeSession
        title="Intelligent Practice Session"
        questions={finalQuestions}
        streak={state.stats?.streak || 0}
        onFinish={(res) => onAward?.(res.correct * 15)}
        onExit={() => setActiveMode('none')}
        onReview={() => setActiveMode('none')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligent Practice Hub"
        description="Master concepts with FSRS-spaced repetition, adaptive quizzes, and complete exam simulations."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => onNavigate('flashcards')}
          className="sf-card p-6 cursor-pointer hover:border-[var(--sf-orange-500)]/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 mb-4">
              <Brain size={22} />
            </div>
            <h3 className="text-base font-semibold text-white">Spaced Flashcards</h3>
            <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">
              Powered by FSRS-6 algorithm. Review cards right when your memory is about to fade.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[var(--sf-orange-400)]">
            <span>{(state.decks || []).reduce((acc, d) => acc + (d.cards?.length || 0), 0)} cards total</span>
            <span>Start &rarr;</span>
          </div>
        </div>

        <div
          onClick={() => setActiveMode('quiz')}
          className="sf-card p-6 cursor-pointer hover:border-[var(--sf-orange-500)]/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-4">
              <Swords size={22} />
            </div>
            <h3 className="text-base font-semibold text-white">Adaptive Quizzes</h3>
            <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">
              Quick 5-10 question checks targeting your recent weak spots and missed concepts.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[var(--sf-orange-400)]">
            <span>{(state.quizzes || []).length} quizzes saved</span>
            <span>Start &rarr;</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('match')}
          className="sf-card p-6 cursor-pointer hover:border-[var(--sf-orange-500)]/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 mb-4">
              <Clock size={22} />
            </div>
            <h3 className="text-base font-semibold text-white">Speed Match</h3>
            <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">
              Test rapid term recognition under time pressure to solidify instant recall.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[var(--sf-orange-400)]">
            <span>Timed Drill</span>
            <span>Play &rarr;</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('exam')}
          className="sf-card p-6 cursor-pointer hover:border-[var(--sf-orange-500)]/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 mb-4">
              <FileQuestion size={22} />
            </div>
            <h3 className="text-base font-semibold text-white">Exam Simulator</h3>
            <p className="mt-1 text-xs text-[var(--sf-text-subtle)]">
              Full-length timed assessments with AI grading rubrics and breakdown reports.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[var(--sf-orange-400)]">
            <span>Full Evaluation</span>
            <span>Simulate &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
}