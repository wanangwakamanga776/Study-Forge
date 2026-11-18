import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className }) => {
  return (
    <div className={cn("w-full h-2 bg-white/10 rounded-full overflow-hidden", className)}>
      <motion.div 
        className="h-full bg-forge-accent"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
};
