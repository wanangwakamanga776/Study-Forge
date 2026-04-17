import { Trophy, Flame, Target, Timer, Layers, BrainCircuit, CheckCircle2, Star, Zap, Video, Play, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AppState, ForgeCastBlueprint } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: string) => void;
  onSelectForgeCast: (fc: ForgeCastBlueprint) => void;
  onDeleteForgeCast: (id: string) => void;
  onOpenForge: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onSelectForgeCast, onDeleteForgeCast, onOpenForge }) => {
  const { stats, tasks, forgeCasts } = state;
  const todayTasks = tasks.filter(t => !t.completed);
  
  const xpToNextLevel = 100 - (stats.xp % 100);
  const progress = (stats.xp % 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ... existing premium banner ... */}

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">The Forge Tools</h2>
          <button 
            onClick={() => {
              onOpenForge();
              soundService.playClick();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-forge-accent text-forge-dark rounded-xl hover:scale-105 transition-all font-display font-extrabold uppercase italic tracking-tighter shadow-[0_0_20px_rgba(251,146,60,0.3)]"
          >
            <Sparkles size={16} />
            Enter The Forge
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
            label="ForgeCasts" 
            color="bg-white/5 border border-white/10 hover:bg-white/10" 
            onClick={() => onNavigate('forge-library')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active ForgeCasts Section */}
          <section className="glass-card rounded-[2.5rem] p-8 sm:p-12 border border-white/5">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Active ForgeCasts</h2>
              <button 
                onClick={() => onNavigate('forge-library')}
                className="text-forge-accent text-xs font-bold uppercase tracking-widest hover:underline"
              >
                View Vault
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
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-forge-accent/20 text-forge-accent rounded-full flex items-center justify-center backdrop-blur-md">
                            <Play size={14} fill="currentColor" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-forge-accent">
                            {fc.metadata.estimated_duration}s Cinematic
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
                        if (window.confirm('Are you sure you want to delete this ForgeCast?')) {
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
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No ForgeCasts generated yet</p>
              </div>
            )}
          </section>

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
                      <span className="ml-auto text-[10px] font-bold text-stone-600 uppercase tracking-widest">{new Date(task.deadline).toLocaleDateString()}</span>
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

        <div className="space-y-8">
          {/* Sidebar content if any */}
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
