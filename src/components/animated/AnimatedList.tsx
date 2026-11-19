import { Children, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  duration?: number;
  initialY?: number;
}

export function AnimatedList({ children, className, stagger = 0.08, duration = 0.4, initialY = 16 }: AnimatedListProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: initialY }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration, delay: index * stagger }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
