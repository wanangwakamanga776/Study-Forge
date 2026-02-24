import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trophy, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { XP_PER_TIMER, MOTIVATIONAL_MESSAGES } from '../constants';

interface FocusTimerProps {
  onComplete: (xp: number) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [customTime, setCustomTime] = useState(25); // in minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [message, setMessage] = useState('');
  const [showBreakWarning, setShowBreakWarning] = useState(false);

  // Persistence logic
  useEffect(() => {
    const savedTime = localStorage.getItem('forge_timer_left');
    const savedMode = localStorage.getItem('forge_timer_mode');
    if (savedTime) setTimeLeft(parseInt(savedTime));
    if (savedMode) setMode(savedMode as 'focus' | 'break');
  }, []);

  useEffect(() => {
    localStorage.setItem('forge_timer_left', timeLeft.toString());
    localStorage.setItem('forge_timer_mode', mode);
  }, [timeLeft, mode]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerEnd = () => {
    setIsActive(false);
    if (mode === 'focus') {
      onComplete(XP_PER_TIMER);
      setMessage(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 5000);
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      setMode('focus');
      setTimeLeft(customTime * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? customTime * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    const clamped = Math.min(Math.max(val, 1), 300); // 1 min to 5 hours (300 mins)
    setCustomTime(clamped);
    if (!isActive) setTimeLeft(clamped * 60);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center p-12 glass-card rounded-[3rem] max-w-md mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-8">
          {mode === 'focus' ? 'Forge Configuration' : 'Quench Break'}
        </h2>

        {!isActive && mode === 'focus' && (
          <div className="mb-8 w-full space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600 text-center">Set Smelting Duration (1-300 mins)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={customTime}
                onChange={handleCustomTimeChange}
                className="forge-slider flex-1"
                style={{
                  // @ts-ignore
                  '--slider-height': '6px',
                  '--slider-bg': 'rgba(255, 255, 255, 0.1)'
                }}
              />
              <span className="text-xl font-display font-bold text-white w-16 text-right italic">{customTime}m</span>
            </div>
          </div>
        )}
        
        <div className="relative flex items-center justify-center w-72 h-72 mb-10">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="136"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="4"
              className="text-white/5"
            />
            <motion.circle
              cx="144"
              cy="144"
              r="136"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 136}
              initial={{ strokeDashoffset: 0 }}
              animate={{ 
                strokeDashoffset: (1 - timeLeft / (mode === 'focus' ? customTime * 60 : 5 * 60)) * 2 * Math.PI * 136 
              }}
              className={mode === 'focus' ? 'text-forge-accent' : 'text-blue-400'}
              style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
            />
          </svg>
          <div className="text-7xl font-extrabold font-display tracking-tighter text-white italic">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex gap-6">
          <button
            onClick={toggleTimer}
            className="p-6 rounded-full bg-white text-forge-dark hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isActive ? <Pause size={32} /> : <Play size={32} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-6 rounded-full bg-white/5 text-stone-400 hover:bg-white/10 transition-all border border-white/10"
          >
            <RotateCcw size={32} />
          </button>
        </div>

        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-10 p-6 bg-forge-accent/10 border border-forge-accent/20 rounded-3xl flex items-center gap-4 text-forge-accent forge-glow"
            >
              <Trophy size={24} />
              <div className="text-sm font-bold uppercase tracking-tighter">
                <p className="text-white">{message}</p>
                <p className="text-[10px] opacity-70">+{XP_PER_TIMER} XP Forged!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Lockout Overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-2xl bg-forge-dark/80"
          >
            <div className="text-center space-y-12">
              <h2 className="text-xl font-display font-extrabold uppercase italic tracking-[0.5em] text-forge-accent forge-glow">The Forge is Hot</h2>
              
              <div className="relative flex items-center justify-center w-96 h-96 mx-auto">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="192"
                    cy="192"
                    r="180"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="192"
                    cy="192"
                    r="180"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 180}
                    animate={{ 
                      strokeDashoffset: (1 - timeLeft / (mode === 'focus' ? customTime * 60 : 5 * 60)) * 2 * Math.PI * 180 
                    }}
                    className={mode === 'focus' ? 'text-forge-accent' : 'text-blue-400'}
                    style={{ filter: 'drop-shadow(0 0 15px currentColor)' }}
                  />
                </svg>
                <div className="text-9xl font-extrabold font-display tracking-tighter text-white italic">
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="space-y-6">
                <button
                  onClick={() => setShowBreakWarning(true)}
                  className="px-12 py-4 border-2 border-white/10 text-stone-400 rounded-2xl hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-xs"
                >
                  Break Forge
                </button>
                <p className="text-stone-600 text-[10px] font-bold uppercase tracking-widest">Stay focused. Mastery requires heat.</p>
              </div>
            </div>

            {/* Break Warning Modal */}
            <AnimatePresence>
              {showBreakWarning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-[210] flex items-center justify-center p-6 bg-forge-dark/90 backdrop-blur-md"
                >
                  <div className="max-w-sm w-full p-10 glass-card rounded-[3rem] text-center space-y-8 border-forge-accent/20">
                    <AlertCircle size={64} className="mx-auto text-forge-accent" />
                    <div className="space-y-2">
                      <h3 className="text-2xl font-display font-extrabold uppercase italic tracking-tighter text-white">Quench the Heat?</h3>
                      <p className="text-stone-400 text-sm font-bold">Breaking the forge will pause your progress. Are you sure you want to exit the focus state?</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowBreakWarning(false)}
                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px]"
                      >
                        Stay Hot
                      </button>
                      <button
                        onClick={() => {
                          setIsActive(false);
                          setShowBreakWarning(false);
                        }}
                        className="flex-1 py-4 bg-forge-accent text-forge-dark rounded-2xl font-display font-extrabold uppercase italic tracking-tighter"
                      >
                        Break Forge
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
