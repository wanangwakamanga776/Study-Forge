import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, User, Crown, Flame, Loader2, RefreshCw } from 'lucide-react';
import { getTopForgers } from '../services/dataService';
import { UserStats } from '../types';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

export const Leaderboard: React.FC = () => {
  const [topForgers, setTopForgers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLearderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await getTopForgers(10);
      setTopForgers(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLearderboard();
  }, []);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: return <Crown size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
      case 1: return <Medal size={20} className="text-stone-300 drop-shadow-[0_0_8px_rgba(214,211,209,0.5)]" />;
      case 2: return <Medal size={20} className="text-amber-700 drop-shadow-[0_0_8px_rgba(120,53,15,0.5)]" />;
      default: return <span className="text-stone-600 font-mono text-sm">#{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-forge-dark/50 rounded-[2.5rem] border border-white/5">
        <Loader2 size={40} className="text-forge-accent animate-spin mb-4" />
        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Consulting the Archives...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">The Elite List</h2>
          <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Master Forgers of the Realm</p>
        </div>
        <button 
          onClick={() => {
            soundService.playClick();
            fetchLearderboard(true);
          }}
          disabled={refreshing}
          className="p-3 bg-white/5 text-stone-500 rounded-2xl hover:text-white transition-all border border-white/5"
        >
          <RefreshCw size={20} className={cn(refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {topForgers.map((forger, index) => (
            <motion.div
              layout
              key={forger.name + index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group relative flex items-center gap-4 p-5 rounded-[2rem] border transition-all hover:scale-[1.01]",
                index < 3 
                  ? "bg-white/[0.03] border-forge-accent/20 shadow-[0_0_30px_rgba(251,146,60,0.05)]" 
                  : "bg-white/[0.01] border-white/5"
              )}
            >
              {/* Rank Badge */}
              <div className="w-10 flex justify-center shrink-0">
                {getRankBadge(index)}
              </div>

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={cn(
                  "w-12 h-12 rounded-2xl overflow-hidden border p-0.5",
                  index === 0 ? "border-yellow-400/50" : "border-white/10"
                )}>
                  {forger.avatarUrl ? (
                    <img 
                      src={forger.avatarUrl} 
                      alt="" 
                      className="w-full h-full rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-forge-dark flex items-center justify-center">
                      <User size={20} className="text-stone-700" />
                    </div>
                  )}
                </div>
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-lg">
                    <Trophy size={10} className="text-forge-dark" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-black uppercase italic tracking-tighter text-white truncate group-hover:text-forge-accent transition-colors">
                  {forger.name || 'Unknown Forger'}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    Rank {forger.level}
                  </span>
                  <div className="w-1 h-1 bg-white/10 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Flame size={10} className="text-forge-accent" />
                    <span className="text-[10px] font-bold text-forge-accent uppercase tracking-widest">
                      {forger.embers} Embers
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Display */}
              <div className="text-right shrink-0">
                <p className="text-lg font-display font-black italic tracking-tighter text-white leading-none">
                  {forger.xp.toLocaleString()}
                </p>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-600">Total XP</p>
              </div>

              {/* Background Rank Glow */}
              {index < 3 && (
                <div className={cn(
                  "absolute inset-0 -z-10 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]",
                  index === 0 ? "from-yellow-400/5 to-transparent" :
                  index === 1 ? "from-stone-400/5 to-transparent" :
                  "from-amber-700/5 to-transparent"
                )} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {topForgers.length === 0 && (
          <div className="py-20 text-center glass-card rounded-[2.5rem] border border-white/5">
            <Trophy size={64} className="mx-auto text-stone-700 mb-6" />
            <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-4">Archives are Silent</h3>
            <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Be the first to leave your mark in the history of the Forge.</p>
          </div>
        )}
      </div>
    </div>
  );
};
