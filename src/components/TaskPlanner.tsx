import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Priority } from '../types';
import { XP_PER_TASK } from '../constants';
import { cn } from '../lib/utils';
import { soundService } from '../services/soundService';

interface TaskPlannerProps {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onComplete: (xp: number) => void;
}

export const TaskPlanner: React.FC<TaskPlannerProps> = ({ tasks, onUpdate, onComplete }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [duration, setDuration] = useState('');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    soundService.playClick();

    const deadline = deadlineDate && deadlineTime 
      ? new Date(`${deadlineDate}T${deadlineTime}`).toISOString()
      : new Date().toISOString();

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      priority,
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

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    // Sort by deadline (soonest first)
    const timeA = new Date(a.deadline).getTime();
    const timeB = new Date(b.deadline).getTime();
    if (timeA !== timeB) return timeA - timeB;

    // Then sort by priority
    const priorityMap = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'Urgent': return '#991B1B';
      case 'High': return '#F97316';
      case 'Medium': return '#FACC15';
      case 'Low': return '#4ADE80';
      default: return '#78716c';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={addTask} className="mb-10 p-8 glass-card rounded-[2.5rem]">
        <div className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="What blueprint are we forging today?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-forge-accent/50 text-white placeholder-stone-500 font-bold"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 ml-2">Priority Matrix</label>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High', 'Urgent'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                      priority === p 
                        ? "border-white/20 text-white shadow-lg"
                        : "border-white/5 text-stone-600 hover:border-white/10"
                    )}
                    style={{ 
                      backgroundColor: priority === p ? getPriorityColor(p) : 'transparent',
                      borderColor: priority === p ? `${getPriorityColor(p)}44` : undefined
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 ml-2">Deadline Path</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-400 focus:ring-2 focus:ring-forge-accent/50"
                />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-stone-400 focus:ring-2 focus:ring-forge-accent/50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 ml-2">Duration Path (mins)</label>
              <input
                type="number"
                placeholder="Estimated Length (e.g. 45)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-6 py-3 rounded-2xl bg-white/5 border border-white/10 focus:ring-2 focus:ring-forge-accent/50 text-white placeholder-stone-500 font-bold"
              />
            </div>
            
            <button
              type="submit"
              className="px-10 py-4 forge-gradient text-forge-dark rounded-2xl hover:scale-105 transition-all font-display font-extrabold uppercase italic tracking-tighter forge-glow h-[58px]"
            >
              <Plus size={20} className="inline mr-2" />
              Forge Task
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group flex items-center gap-6 p-6 glass-card rounded-3xl transition-all border-l-4",
                task.completed && "opacity-40 grayscale"
              )}
              style={{ borderLeftColor: getPriorityColor(task.priority) }}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "transition-all duration-300",
                  task.completed ? "text-emerald-500 scale-110" : "text-stone-600 hover:text-stone-400"
                )}
              >
                {task.completed ? <CheckCircle2 size={28} className="forge-glow" /> : <Circle size={28} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "text-lg font-bold text-white truncate",
                  task.completed && "line-through text-stone-500"
                )}>
                  {task.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span 
                    className="text-[9px] uppercase tracking-[0.2em] font-black px-2 py-1 rounded-lg text-white"
                    style={{ backgroundColor: `${getPriorityColor(task.priority)}33`, border: `1px solid ${getPriorityColor(task.priority)}55` }}
                  >
                    {task.priority}
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    {new Date(task.deadline).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {task.duration > 0 && (
                    <div className="flex items-center gap-1.5 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                      <Plus size={12} className="rotate-45" />
                      {task.duration} mins
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-3 text-stone-600 hover:text-red-500 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && (
          <div className="text-center py-20 text-stone-600">
            <p className="text-lg font-bold uppercase tracking-widest">The Forge is Idle</p>
            <p className="text-sm mt-1">No blueprints found. Start forging your future.</p>
          </div>
        )}
      </div>
    </div>
  );
};
