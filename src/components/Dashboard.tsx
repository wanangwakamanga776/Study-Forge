import { Trophy, Flame, Target, Timer, Layers, BrainCircuit, CheckCircle2, Star, Zap, Video, Play, Sparkles, Trash2, Quote, Activity, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, ForgeCastBlueprint } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';
import { PYRA_TIPS } from '../constants';
import { PyraMascot } from './PyraMascot';
import { useState, useEffect } from 'react';
import { AboutMeSection } from './AboutMeSection';
import { DailyQuests } from './DailyQuests';
import { ForgeActivityFeed } from './ForgeActivityFeed';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onSelectForgeCast: (fc: ForgeCastBlueprint) => void;
  onDeleteForgeCast: (id: string) => void;
  onOpenForge: () => void;
  isAdmin?: boolean;
  isGuest?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onSelectForgeCast, onDeleteForgeCast, onOpenForge, isAdmin, isGuest }) => {
  const { stats, tasks, forgeCasts } = state;
  const todayTasks = tasks.filter(t => !t.completed);
  
  const xpToNextLevel = 1000 - (stats.xp % 1000);
  const progress = (stats.xp % 1000) / 10;

  const [activeTip, setActiveTip] = useState(PYRA_TIPS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomTip = PYRA_TIPS[Math.floor(Math.random() * PYRA_TIPS.length)];
      setActiveTip(randomTip);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Guest Disclaimer Banner */}
      <AnimatePresence>
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-forge-accent/10 border border-forge-accent/20 rounded-3xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-forge-accent/20 text-forge-accent rounded-lg">
                <Shield size={20} />
              </div>
              <p className="text-xs font-bold text-stone-300 uppercase tracking-widest">
                You are currently in <span className="text-forge-accent italic">Guest Mode</span>. Your progress is only saved locally in this browser.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-forge-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-4 bg-forge-accent/10 text-forge-accent rounded-2xl forge-glow relative z-10">
            <Trophy size={32} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Level {stats.level}</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{stats.xp} XP</h3>
            <div className="w-32 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full forge-gradient shadow-[0_0_10px_rgba(251,146,60,0.5)]"
              />
            </div>
            <p className="text-[10px] text-stone-600 mt-1 font-bold">{xpToNextLevel} XP to Next Tier</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.2)] relative z-10">
            <Flame size={32} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Current Streak</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{stats.streak} Days</h3>
            <p className="text-[10px] text-stone-600 mt-1 font-bold uppercase tracking-widest">Keep Learning</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 glass-card rounded-[2rem] flex items-center gap-6 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(52,211,153,0.2)] relative z-10">
            <Target size={32} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Tasks Today</p>
            <h3 className="text-2xl font-extrabold font-display uppercase italic tracking-tighter text-white">{todayTasks.length} Pending</h3>
            <p className="text-[10px] text-stone-600 mt-1 font-bold uppercase tracking-widest">Focusing on Goals</p>
          </div>
        </motion.div>
      </div>

      {/* Daily Challenges and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DailyQuests />
        </div>
        <div>
          <ForgeActivityFeed />
        </div>
      </div>

      {/* Study Center */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Study Forge</h2>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Your Professional Study Environment</p>
          </div>
          <button 
            onClick={() => {
              onOpenForge();
              soundService.playClick();
            }}
            className="hidden sm:flex items-center gap-3 px-8 py-4 bg-forge-accent text-forge-dark rounded-2xl hover:scale-105 transition-all font-display font-extrabold uppercase italic tracking-tighter shadow-[0_0_30px_rgba(251,146,60,0.3)]"
          >
            <Sparkles size={20} />
            Generate Lesson
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          <QuickActionButton 
            icon={<Timer size={24} />} 
            label="Timer" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('timer')}
          />
          <QuickActionButton 
            icon={<Layers size={24} />} 
            label="Cards" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('flashcards')}
          />
          <QuickActionButton 
            icon={<Zap size={24} />} 
            label="Match" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('match')}
          />
          <QuickActionButton 
            icon={<BrainCircuit size={24} />} 
            label="Quiz" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('quiz')}
          />
          <QuickActionButton 
            icon={<Video size={24} />} 
            label="Library" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('forge-library')}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Lessons Section */}
          <section className="glass-card rounded-[2.5rem] p-8 sm:p-12 border border-white/5">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Curriculum Lessons</h2>
              <button 
                onClick={() => onNavigate('forge-library')}
                className="text-forge-accent text-xs font-bold uppercase tracking-widest hover:underline"
              >
                View Library
              </button>
            </div>
            {forgeCasts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {forgeCasts.slice(0, 2).map(fc => (
                  <motion.div 
                    key={fc.id}
                    whileHover={{ scale: 1.02 }}
                    className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer border border-white/5"
                  >
                    <div 
                      className="absolute inset-0 z-0"
                      onClick={() => {
                        onSelectForgeCast(fc);
                        onNavigate('forge-player');
                        soundService.playClick();
                      }}
                    >
                      <img 
                        src={`https://picsum.photos/seed/${fc.metadata.title}/800/450`} 
                        alt={fc.metadata.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-forge-accent/20 text-forge-accent rounded-full flex items-center justify-center backdrop-blur-md">
                            <Play size={14} fill="currentColor" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent">
                            {fc.metadata.estimated_duration}s Studio
                          </span>
                        </div>
                        <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white group-hover:text-forge-accent transition-colors">
                          {fc.metadata.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this Lesson?')) {
                          onDeleteForgeCast(fc.id);
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10 backdrop-blur-md border border-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2rem]">
                <Video size={48} className="mx-auto text-stone-700 mb-4" />
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No lessons generated yet</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* Today's Tasks Preview */}
          <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-extrabold font-display uppercase italic tracking-tighter text-white text-xl">Daily Plan</h3>
              <button 
                onClick={() => onNavigate('planner')}
                className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-forge-accent transition-colors"
              >
                Planner
              </button>
            </div>
            <div className="p-8">
              {todayTasks.length > 0 ? (
                <div className="space-y-6">
                  {todayTasks.slice(0, 4).map(task => (
                    <div key={task.id} className="flex items-center gap-5 group">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === 'Urgent' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                        task.priority === 'High' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
                        task.priority === 'Medium' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : 
                        "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      )} />
                      <span className="text-stone-300 font-bold text-sm group-hover:text-white transition-colors truncate flex-1">{task.title}</span>
                      <span className="text-[8px] font-black text-stone-700 uppercase tracking-widest shrink-0">{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-4 forge-glow">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-white font-bold uppercase tracking-widest text-[10px]">Agenda Clear</p>
                </div>
              )}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center text-center relative overflow-hidden"
          >
            <PyraMascot 
              expression="happy" 
              message="Keep forging ahead!" 
              className="mb-6"
            />
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-forge-accent">
                <Quote size={12} className="opacity-50" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Academy Bulletin</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={activeTip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-stone-400 text-xs font-bold leading-relaxed px-4"
                >
                  "{activeTip}"
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <AboutMeSection />
    </div>
  );
};

const QuickActionButton: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -5 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-8 rounded-3xl text-white shadow-xl transition-all duration-300",
      color
    )}
  >
    <div className="mb-4 p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <span className="font-black text-xs uppercase tracking-[0.2em]">{label}</span>
  </motion.button>
);

