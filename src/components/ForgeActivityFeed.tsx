import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sparkles, BookOpen, Trophy, Zap, MessageSquare } from 'lucide-react';
import { cn, generateId } from '../lib/utils';

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: number;
  type: 'achievement' | 'study' | 'creation' | 'community';
}

const INITIAL_ACTIVITIES: Activity[] = [
  { id: '1', user: 'Alex_Archer', action: 'completed', target: 'Intro to Thermodynamics', timestamp: Date.now() - 1000 * 60 * 5, type: 'study' },
  { id: '2', user: 'Wana', action: 'reached', target: 'Level 15', timestamp: Date.now() - 1000 * 60 * 15, type: 'achievement' },
  { id: '3', user: 'Sarah_K', action: 'published', target: 'Organic Chem Flashcards', timestamp: Date.now() - 1000 * 60 * 45, type: 'community' },
  { id: '4', user: 'Leo_The_Lion', action: 'unlocked', target: 'Midnight Purple Theme', timestamp: Date.now() - 1000 * 60 * 120, type: 'creation' },
  { id: '5', user: 'System', action: 'updated', target: 'Academy Archives v2.4', timestamp: Date.now() - 1000 * 60 * 240, type: 'community' },
];

export function ForgeActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new random activity occasionally - slowed down for beta
      if (Math.random() > 0.85) {
        const users = ['StudyBot', 'QuantumQueen', 'LogicLearner', 'AstroAce', 'HistoryHero'];
        const actions = ['mastered', 'acquired', 'shared', 'forged'];
        const targets = ['Ancient Civilizations', 'Neural Networks', 'Golden Gilded Cover', 'Advanced Algebra', 'Matrix Code Theme'];
        const types: Activity['type'][] = ['study', 'achievement', 'community', 'creation'];
        
        const newActivity: Activity = {
          id: generateId(),
          user: users[Math.floor(Math.random() * users.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          target: targets[Math.floor(Math.random() * targets.length)],
          timestamp: Date.now(),
          type: types[Math.floor(Math.random() * types.length)]
        };
        
        setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
      }
    }, 45000); // Increased to 45 seconds to feel more "legit" for beta tests

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'achievement': return <Trophy size={14} className="text-forge-accent" />;
      case 'creation': return <Zap size={14} className="text-blue-400" />;
      case 'community': return <BookOpen size={14} className="text-emerald-400" />;
      case 'study': return <Sparkles size={14} className="text-purple-400" />;
      default: return <User size={14} className="text-stone-500" />;
    }
  };

  return (
    <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Live Activity</h2>
          <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mt-1">Real-time Academy Updates</p>
        </div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-4 group"
            >
              <div className="mt-1 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-stone-300 leading-tight">
                  <span className="text-white font-black uppercase tracking-tighter">{activity.user}</span>
                  {" "}{activity.action}{" "}
                  <span className="text-forge-accent italic">{activity.target}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest">
                    {Math.floor((Date.now() - activity.timestamp) / 60000)}m ago
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
