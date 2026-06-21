import { Trophy, Flame, Target, Timer, Layers, BrainCircuit, CheckCircle2, Star, Zap, Video, Play, Sparkles, Trash2, Quote, Activity, Shield, Upload } from 'lucide-react';
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
import { ActivistDesk } from './ActivistDesk';
import { FeedbackSection } from './FeedbackSystem';
import { AnnouncementBar } from './AnnouncementBar';

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
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      <AnnouncementBar />
      {/* Guest Disclaimer Banner */}
      <AnimatePresence>
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-forge-accent/5 border border-forge-accent/10 rounded-[2rem] p-5 flex items-center justify-between gap-4 glass-card"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-forge-accent/20 text-forge-accent rounded-xl">
                <Shield size={18} />
              </div>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
                Guest Mode: <span className="text-forge-accent">Progress is temporary</span>. Log in to save your study data permanently.
              </p>
            </div>
            <button className="text-[8px] font-black uppercase tracking-widest text-forge-accent hover:text-white transition-colors">Initialize Sync</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Hero Section & Core Stats Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Knowledge Scraper Hero - Bento Large */}
        <section className="lg:col-span-3 relative group overflow-hidden rounded-[3.5rem] p-12 glass-card border-white/10 shadow-2xl cinematic-shadow min-h-[450px] flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-forge-dark via-forge-dark to-orange-950/20 z-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.1),transparent_50%)] z-1" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-forge-accent/10 rounded-full blur-[100px] animate-pulse" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md"
                >
                  <div className="w-2 h-2 rounded-full bg-forge-accent animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Ready to Learn</span>
                </motion.div>
              </div>
              <h2 className="text-5xl md:text-7xl font-black font-display uppercase italic tracking-tighter text-white leading-[0.85] drop-shadow-2xl">
                Master Your <br/> <span className="text-forge-accent text-glow">Topics</span>
              </h2>
              <p className="text-white/40 font-medium italic text-lg max-w-xl leading-relaxed border-l border-white/10 pl-8">
                Our AI analyzes your materials to help you learn faster and remember longer. Turn any topic into a personalized study plan.
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenForge}
                  className="px-10 py-5 bg-white text-forge-dark rounded-3xl font-display font-black uppercase italic tracking-tighter hover:shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition-all text-xl flex items-center gap-4 group"
                >
                  <Sparkles size={24} className="text-forge-accent group-hover:rotate-12 transition-transform" />
                  Start Learning
                </motion.button>
                <div className="flex items-center gap-8 px-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Accuracy</span>
                    <span className="text-white font-black italic tracking-tighter text-2xl">99.8%</span>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Speed</span>
                    <span className="text-white font-black italic tracking-tighter text-2xl">&lt; 2.4s</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hidden xl:block relative group">
                <div className="absolute inset-0 bg-forge-accent/20 blur-[80px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />
                <PyraMascot 
                  expression="excited" 
                  message="System ready for data ingestion."
                  className="scale-[1.4] transition-transform duration-700 group-hover:scale-[1.5]"
                />
            </div>
          </div>
        </section>

        {/* Stats Vertical Bento */}
        <div className="grid grid-cols-1 gap-6">
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="p-8 glass-card rounded-[3rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-forge-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="p-3 bg-forge-accent/10 text-forge-accent rounded-2xl">
                <Trophy size={28} />
              </div>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">RANK {stats.level}</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black font-display uppercase italic tracking-tighter text-white leading-none mb-4">{stats.xp} XP</h3>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="absolute inset-y-0 left-0 forge-gradient shadow-[0_0_15px_rgba(251,146,60,0.6)]"
                />
              </div>
              <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">{xpToNextLevel} TO NEXT LEVEL</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="p-8 glass-card rounded-[3rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl">
                <Flame size={28} />
              </div>
              <div className="flex gap-1">
                {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-red-500/20 rounded-full animate-pulse" />)}
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black font-display uppercase italic tracking-tighter text-white leading-none mb-2">{stats.streak} DAYS</h3>
              <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">STUDY STREAK</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Activist Desk - News & Announcements */}
      <ActivistDesk />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 space-y-12">
          {/* Quick Actions Engine */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-0.5 w-12 bg-white/5" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Quick Start</h3>
              <div className="flex-1 h-0.5 bg-white/5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <QuickActionButton 
                icon={<Timer size={26} />} 
                label="Focus" 
                color="hover:border-white/20" 
                onClick={() => onNavigate('timer')}
              />
              <QuickActionButton 
                icon={<Layers size={26} />} 
                label="Review" 
                color="hover:border-white/20" 
                onClick={() => onNavigate('flashcards')}
              />
              <QuickActionButton 
                icon={<Zap size={26} />} 
                label="Match" 
                color="hover:border-white/20" 
                onClick={() => onNavigate('match')}
              />
              <QuickActionButton 
                icon={<BrainCircuit size={26} />} 
                label="Quiz" 
                color="hover:border-white/20" 
                onClick={() => onNavigate('quiz')}
              />
              <QuickActionButton 
                icon={<Video size={26} />} 
                label="Library" 
                color="hover:border-white/20" 
                onClick={() => onNavigate('forge-library')}
              />
            </div>
          </section>

          {/* Curriculum Lessons & Activity */}
          <section className="glass-card rounded-[3.5rem] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-forge-accent/5 blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">My Lessons</h2>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Recent Study Material</p>
              </div>
              <button 
                onClick={() => onNavigate('forge-library')}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              >
                See All
              </button>
            </div>

            {forgeCasts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {forgeCasts.slice(0, 4).map((fc, index) => (
                  <motion.div 
                    key={fc.id}
                    whileHover={{ y: -5 }}
                    className="group relative aspect-video rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 cinematic-shadow"
                    onClick={() => {
                        onSelectForgeCast(fc);
                        onNavigate('forge-player');
                        soundService.playClick();
                    }}
                  >
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={`https://picsum.photos/seed/${encodeURIComponent(fc.metadata.title)}/800/450`} 
                        alt={fc.metadata.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-forge-dark via-forge-dark/40 to-transparent p-10 flex flex-col justify-end">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-forge-accent text-forge-dark rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(251,146,60,0.5)]">
                            <Play size={18} fill="currentColor" className="ml-1" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-forge-accent">
                            {fc.metadata.estimated_duration}s Lesson
                          </span>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-6 right-6 px-3 py-1 bg-emerald-500/80 text-white text-[10px] uppercase font-black rounded-lg">
                            Latest
                          </div>
                        )}
                        <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white leading-[1.1] truncate">
                          {fc.metadata.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this lesson?')) {
                          onDeleteForgeCast(fc.id);
                        }
                      }}
                      className="absolute top-6 right-6 p-3 bg-red-500/20 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10 backdrop-blur-xl border border-red-500/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white/20">
                    <Video size={40} />
                </div>
                <h3 className="text-xl font-display font-black uppercase text-white/30">No Lessons Yet</h3>
                <p className="text-white/10 font-black uppercase tracking-[0.2em] text-[10px] mt-2">Create your first lesson to start studying.</p>
                <button 
                  onClick={onOpenForge}
                  className="mt-8 px-10 py-4 bg-white text-forge-dark rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Create Lesson
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Widgets Column */}
        <div className="xl:col-span-4 space-y-10">
          {/* Daily Quests - Shifted to sidebar for better balance */}
          <div className="glass-card rounded-[3rem] p-8 border border-white/5">
             <DailyQuests />
          </div>

          {/* Strategic Planner Preview */}
          <div className="glass-card rounded-[3rem] overflow-hidden border border-white/5 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black uppercase italic tracking-tighter text-white text-2xl">Study Plan</h3>
                <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.3em]">Tasks</p>
              </div>
              <button 
                onClick={() => onNavigate('planner')}
                className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-colors"
                title="Planner"
              >
                <Target size={20} />
              </button>
            </div>
            <div className="p-8 space-y-8">
              {todayTasks.length > 0 ? (
                <div className="space-y-6">
                  {todayTasks.slice(0, 5).map(task => (
                    <motion.div 
                      key={task.id} 
                      whileHover={{ x: 5 }}
                      className="flex items-center gap-5 group cursor-pointer"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === 'Urgent' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" :
                        task.priority === 'High' ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" :
                        task.priority === 'Medium' ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]" : 
                        "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      )} />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/60 font-bold text-sm group-hover:text-white transition-colors truncate block">{task.title}</span>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em] mt-0.5">{task.priority} Priority</p>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 shrink-0">{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </motion.div>
                  ))}
                  <button 
                    onClick={() => onNavigate('planner')}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl border border-white/5 transition-all"
                  >
                    View Planner
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 opacity-30">
                  <div className="inline-flex p-5 bg-emerald-500/10 text-emerald-400 rounded-3xl mb-4 border border-emerald-500/20">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-white font-black uppercase tracking-[0.3em] text-[8px]">All Done!</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Tutor Floating Widget */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden group border border-white/5 cinematic-shadow"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-forge-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-forge-accent/20 blur-[60px] rounded-full animate-pulse" />
                <PyraMascot 
                  expression="happy" 
                  message="Optimizing your study session." 
                  className="scale-125 hover:scale-150 transition-transform duration-700"
                />
            </div>
            
            <div className="relative space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Sparkles size={12} className="text-forge-accent" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50">Study Tip</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={activeTip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-white/60 text-sm font-medium leading-relaxed italic px-2 drop-shadow-sm min-h-[60px]"
                >
                  "{activeTip}"
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <div className="glass-card rounded-[3rem] p-8 border border-white/5">
             <div className="flex items-center gap-3 mb-8">
                <Activity size={20} className="text-forge-accent" />
                <h3 className="font-display font-black uppercase italic tracking-tighter text-white text-xl">Recent Activity</h3>
             </div>
             <ForgeActivityFeed />
          </div>
        </div>
      </div>

      <div className="pt-20 border-t border-white/5 space-y-24">
        <FeedbackSection />
        <AboutMeSection />
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -5 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-8 aspect-square rounded-[2.5rem] text-white shadow-xl transition-all duration-300 relative overflow-hidden group glass-card glass-card-hover",
      color
    )}
  >
    <div className="mb-4 p-5 bg-white/5 rounded-3xl group-hover:bg-forge-accent/20 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(251,146,60,0.3)] text-white/30 group-hover:text-forge-accent group-hover:rotate-6">
      {icon}
    </div>
    <span className="font-black text-[10px] uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-colors">{label}</span>
  </motion.button>
);

