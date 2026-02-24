import React from 'react';
import { Trophy, Flame, Target, Timer, Layers, BrainCircuit, CheckCircle2, Star, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AppState } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onGenerated: (type: 'flashcards' | 'quiz', data: any) => void;
  onOpenPremium: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onGenerated, onOpenPremium }) => {
  const { stats, tasks } = state;
  const todayTasks = tasks.filter(t => !t.completed);
  
  const xpToNextLevel = 100 - (stats.xp % 100);
  const progress = (stats.xp % 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Premium Banner for Free Users */}
      {stats.plan === 'Free' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden p-6 bg-gradient-to-r from-amber-400 to-amber-600 rounded-[2rem] text-white shadow-xl"
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Star size={32} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Upgrade to StudySprint Premium</h3>
                <p className="text-amber-50 text-sm opacity-90">Unlimited AI generations, advanced stats, and more.</p>
              </div>
            </div>
            <button 
              onClick={onOpenPremium}
              className="px-8 py-3 bg-white text-amber-600 rounded-2xl font-bold hover:bg-amber-50 transition-colors shadow-lg"
            >
              Unlock Now
            </button>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10">
            <Star size={200} fill="currentColor" />
          </div>
        </motion.div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6"
        >
          <div className="p-4 bg-forge-accent/10 text-forge-accent rounded-2xl forge-glow">
            <Trophy size={32} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Level {stats.level}</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{stats.xp} XP</h3>
            <div className="w-32 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full forge-gradient"
              />
            </div>
            <p className="text-[10px] text-stone-600 mt-1 font-bold">{xpToNextLevel} XP to Next Tier</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6"
        >
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <Flame size={32} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Current Streak</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{stats.streak} Days</h3>
            <p className="text-[10px] text-stone-600 mt-1 font-bold uppercase tracking-widest">The Forge is Hot</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6"
        >
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(52,211,153,0.2)]">
            <Target size={32} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Tasks Today</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{todayTasks.length} Pending</h3>
            <p className="text-[10px] text-stone-600 mt-1 font-bold uppercase tracking-widest">Ready to Smelt</p>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <QuickActionButton 
          icon={<Timer size={24} />} 
          label="Focus Timer" 
          color="bg-white/5 border border-white/10 hover:bg-white/10" 
          onClick={() => onNavigate('timer')}
        />
        <QuickActionButton 
          icon={<Layers size={24} />} 
          label="Flashcards" 
          color="bg-white/5 border border-white/10 hover:bg-white/10" 
          onClick={() => onNavigate('flashcards')}
        />
        <QuickActionButton 
          icon={<BrainCircuit size={24} />} 
          label="Quick Quiz" 
          color="bg-white/5 border border-white/10 hover:bg-white/10" 
          onClick={() => onNavigate('quiz')}
        />
      </div>

      {/* Today's Tasks Preview */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-extrabold font-display uppercase italic tracking-tighter text-white text-xl">Today's Blueprints</h3>
          <button 
            onClick={() => onNavigate('planner')}
            className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-forge-accent transition-colors"
          >
            Open Planner
          </button>
        </div>
        <div className="p-8">
          {todayTasks.length > 0 ? (
            <div className="space-y-6">
              {todayTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-5 group">
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-lg",
                    task.priority === 'High' ? "bg-red-500 shadow-red-500/20" :
                    task.priority === 'Medium' ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-500 shadow-blue-500/20"
                  )} />
                  <span className="text-stone-300 font-bold group-hover:text-white transition-colors">{task.title}</span>
                  <span className="ml-auto text-[10px] font-bold text-stone-600 uppercase tracking-widest">{task.dueDate}</span>
                </div>
              ))}
              {todayTasks.length > 3 && (
                <p className="text-[10px] font-bold text-stone-600 text-center pt-4 uppercase tracking-widest">
                  + {todayTasks.length - 3} more blueprints
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-6 forge-glow">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-stone-400 font-bold uppercase tracking-tighter text-lg">All Blueprints Completed</p>
              <p className="text-stone-600 text-xs mt-1 uppercase tracking-widest font-bold">The Forge is clear for today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-8 rounded-3xl text-white shadow-lg transition-shadow hover:shadow-xl",
      color
    )}
  >
    <div className="mb-4 p-3 bg-white/20 rounded-2xl">
      {icon}
    </div>
    <span className="font-bold tracking-tight">{label}</span>
  </motion.button>
);
