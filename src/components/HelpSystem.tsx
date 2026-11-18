import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface HelpContent {
  title: string;
  explanation: string;
  tips: string[];
}

const helpData: Record<string, HelpContent> = {
  dashboard: {
    title: 'Dashboard',
    explanation: 'Your central control node for tracking progress, managing active learning, and navigating to all study modules.',
    tips: ['Monitor your current level and experience bar progress.', 'Check the Activity Feed for recent system updates.', 'Always keep an eye on your streak to maximize rewards.']
  },
  planner: {
    title: 'Planner',
    explanation: 'A strategic task management tool to organize study sessions, set priorities, and track your deadlines.',
    tips: ['Add study tasks and assign priority levels based on urgency.', 'Mark tasks as done to earn XP and progress through levels.', 'Use the timeline view to stay on top of your study schedule.']
  },
  'study-guide': {
    title: 'Study Guide',
    explanation: 'Transform raw notes, uploaded documents, or images into beautifully structured, AI-generated revision resources.',
    tips: ['Upload PDFs, DOCX, or images of notes to start.', 'Paste raw text directly for quick content conversion.', 'Choose a guide mode—like "Quick Revision" or "Deep Understanding"—to tailor the generation to your needs.']
  },
  lessons: {
    title: 'Learning Paths',
    explanation: 'Curated, structured learning journeys designed for effective, step-by-step mastery of complex subjects.',
    tips: ['Follow the logical sequence of lessons to build foundational knowledge.', 'Track your progress through each path as you conquer new concepts.', 'Complete entire paths to unlock advanced content and earn exclusive rewards.']
  },
  flashcards: {
    title: 'Flashcards',
    explanation: 'Optimize memory retention using adaptive flashcards powered by spaced repetition principles.',
    tips: ['Rate your confidence on each card to manage frequency.', 'Use weak-topic review to double-down on concepts you find difficult.', 'The system automatically adapts based on your performance.']
  },
  timer: {
    title: 'Focus Timer',
    explanation: 'Enhance productivity using deep-work focus sessions managed by an integrated timer.',
    tips: ['Set a focus interval, then hide distractions.', 'Use in combination with flashcards or lessons for intensive study.', 'Take regulated breaks to prevent study burnout.']
  },
  // Add other views as needed
};

export const HelpModal: React.FC<{ view: string; onClose: () => void }> = ({ view, onClose }) => {
  const content = helpData[view] || { title: 'Help', explanation: 'No help available for this view.', tips: [] };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-forge-dark border border-white/10 p-8 rounded-3xl max-w-lg w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 text-white/50 hover:text-white" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black text-white mb-4">{content.title}</h2>
        <p className="text-stone-400 mb-6">{content.explanation}</p>
        <h4 className="font-bold text-white mb-2">Study Tips:</h4>
        <ul className="space-y-2">
          {content.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-stone-500 text-sm italic">
                <ChevronRight size={16} className="text-forge-accent shrink-0 mt-0.5" />
                {tip}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
};

export const HelpButton: React.FC<{ view: string; className?: string }> = ({ view, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div 
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            setIsOpen(true);
          }
        }}
        className={cn("cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all", className)}
        title="Help"
      >
        <HelpCircle size={20} />
      </div>
      <AnimatePresence>
        {isOpen && <HelpModal view={view} onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
