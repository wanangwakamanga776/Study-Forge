import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, Flag, Clock, Tag, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Priority } from '../types';
import { XP_PER_TASK } from '../constants';
import { cn, generateId } from '../lib/utils';
import { soundService } from '../services/soundService';

interface TaskPlannerProps {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onComplete: (xp: number) => void;
}

const DEFAULT_SECTIONS = ['Personal', 'Educational', 'Work/Professional', 'Health & Wellness', 'General'];

export const TaskPlanner: React.FC<TaskPlannerProps> = ({ tasks, onUpdate, onComplete }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [section, setSection] = useState('Personal');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [duration, setDuration] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskTitle.trim()) return;
    soundService.playClick();

    const deadline = deadlineDate && deadlineTime 
      ? new Date(`${deadlineDate}T${deadlineTime}`).toISOString()
      : new Date().toISOString();

    const newTask: Task = {
      id: generateId(),
      title: newTaskTitle,
      priority,
      section,
      deadline,
      duration: parseInt(duration) || 0,
      completed: false,
      createdAt: Date.now(),
    };

    onUpdate([...tasks, newTask]);
    setNewTaskTitle('');
    setDeadlineDate('');
    setDeadlineTime('');
    setDuration('');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === id) {
        if (!task.completed) {
          onComplete(XP_PER_TASK);
          soundService.playSuccess();
        } else {
          soundService.playClick();
        }
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    onUpdate(updatedTasks);
  };

  const deleteTask = (id: string) => {
    onUpdate(tasks.filter(t => t.id !== id));
    soundService.playClick();
  };

  const getPriorityInfo = (p: Priority) => {
    switch (p) {
      case 'Urgent': return { name: 'P1', color: '#DC143C' }; // Crimson Red
      case 'High': return { name: 'P2', color: '#F97316' }; // Orange
      case 'Medium': return { name: 'P3', color: '#ADFF2F' }; // Greenish Yellow
      case 'Low': return { name: 'P4', color: '#90EE90' }; // Light Green
      default: return { name: 'P4', color: '#90EE90' };
    }
  };

  const sections = Array.from(new Set([...DEFAULT_SECTIONS, ...tasks.map(t => t.section || 'General')]));

  // AI Assistant Tip
  const highPriorityCount = tasks.filter(t => !t.completed && (t.priority === 'Urgent' || t.priority === 'High')).length;
  const assistantTip = highPriorityCount > 0 
    ? `You have ${highPriorityCount} high-priority tasks remaining. I suggest completing those first to stay ahead of your schedule.`
    : tasks.filter(t => !t.completed).length > 0
    ? "Great job! You have a clear path today. Keep checking off your tasks to build momentum."
    : "Your schedule is clear. Use this time to prepare for tomorrow or take a well-deserved break.";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* AI Assistant Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 glass-card rounded-3xl border border-forge-accent/20 flex gap-4 items-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-forge-accent/10 flex items-center justify-center shrink-0">
          <MessageSquare size={24} className="text-forge-accent" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-forge-accent mb-1">Planner Assistant</p>
          <p className="text-sm text-stone-300 font-medium leading-relaxed">{assistantTip}</p>
        </div>
      </motion.div>

      {/* Quick Add Section */}
      <div className="glass-card rounded-[2.5rem] p-4">
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-3 px-6 py-4 text-stone-500 hover:text-white transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-forge-accent/10 flex items-center justify-center text-forge-accent group-hover:scale-110 transition-transform">
              <Plus size={16} />
            </div>
            <span className="font-bold text-sm">What do you need to get done?</span>
          </button>
        ) : (
          <form onSubmit={addTask} className="p-4 space-y-6">
            <input
              autoFocus
              type="text"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addTask();
                }
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="w-full bg-transparent text-white text-lg font-bold placeholder:text-stone-700 outline-none"
            />
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Subject Selector */}
              <select 
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-400 outline-none focus:border-forge-accent transition-colors"
              >
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Priority Flags */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {(['Urgent', 'High', 'Medium', 'Low'] as Priority[]).map((p) => {
                  const info = getPriorityInfo(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      title={info.name}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        priority === p ? "bg-white/10 text-white" : "text-stone-600 hover:text-stone-400"
                      )}
                    >
                      <Flag size={14} fill={priority === p ? info.color : 'none'} color={info.color} />
                    </button>
                  );
                })}
              </div>

              {/* Date/Time */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-400 outline-none focus:border-forge-accent"
                />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-stone-400 outline-none focus:border-forge-accent"
                />
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Clock size={12} className="text-stone-600" />
                <input
                  type="number"
                  placeholder="Min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-12 bg-transparent text-[10px] font-bold text-white outline-none placeholder:text-stone-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-stone-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-8 py-2 bg-forge-accent text-forge-dark rounded-xl text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95"
              >
                Add Task
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Task List Grouped by Sections */}
      <div className="space-y-12">
        {sections.map(s => {
          const sectionTasks = tasks.filter(t => (t.section || 'General') === s);
          if (sectionTasks.length === 0) return null;

          return (
            <div key={s} className="space-y-4">
              <div className="flex items-center gap-4 px-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/50">{s}</h3>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {sectionTasks.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0)).map((task) => {
                    const info = getPriorityInfo(task.priority);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className={cn(
                          "group h-12 flex items-center gap-4 px-4 glass-card rounded-2xl border-l-[3px] transition-all hover:border-l-forge-accent hover:shadow-[0_0_15px_rgba(251,146,60,0.1)]",
                          task.completed ? "opacity-30 grayscale" : "border-l-transparent"
                        )}
                        style={{ borderLeftColor: task.completed ? undefined : info.color }}
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            task.completed 
                              ? "bg-emerald-500 border-emerald-500" 
                              : "border-stone-700 hover:border-stone-500"
                          )}
                        >
                          {task.completed && <CheckCircle2 size={12} className="text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <span className={cn(
                            "text-sm font-bold text-white transition-all overflow-hidden text-nowrap truncate",
                            task.completed && "line-through text-stone-500"
                          )}>
                            {task.title}
                          </span>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {task.duration > 0 && (
                              <div className="flex items-center gap-1.5 text-stone-600 text-[10px] font-bold">
                                <Clock size={10} />
                                {task.duration}m
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-stone-600 text-[10px] font-bold">
                              <Calendar size={10} />
                              {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                            <Flag size={10} color={info.color} fill={info.color} className="opacity-60" />
                          </div>
                        </div>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-stone-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="text-center py-24 glass-card rounded-[3rem] border border-white/5 mt-10">
            <p className="text-lg font-black uppercase tracking-widest text-stone-700 italic">Clear Horizons</p>
            <p className="text-stone-600 text-[10px] font-bold uppercase tracking-widest mt-2 px-12">
              No tasks pending. Your strategy is fully synchronized.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

