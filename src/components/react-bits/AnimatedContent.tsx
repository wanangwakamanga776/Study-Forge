import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../lib/motion';
import { cn } from '../../lib/utils';

interface AnimatedContentProps {
  children: ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  delay?: number;
  ease?: 'easeOut' | 'easeIn' | 'easeInOut' | 'linear';
  initialOpacity?: number;
  animateOpacity?: boolean;
  threshold?: number;
  className?: string;
}

export default function AnimatedContent({
  children,
  distance = 24,
  direction = 'vertical',
  reverse = false,
  duration = 0.65,
  delay = 0,
  ease = 'easeOut',
  initialOpacity = 0,
  animateOpacity = true,
  className,
}: AnimatedContentProps) {
  const reduced = usePrefersReducedMotion();
  const axis = direction === 'vertical' ? 'y' : 'x';
  const offset = reverse ? -distance : distance;
  const initial = reduced ? { opacity: 1 } : { opacity: animateOpacity ? initialOpacity : 1, [axis]: offset } as any;
  const animate = { opacity: 1, [axis]: 0 } as any;
  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: reduced ? 0.01 : duration, delay: reduced ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
}
