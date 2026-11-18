import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../../lib/motion';
import { cn } from '../../lib/utils';

interface BlurTextProps {
  text: string;
  className?: string;
  animateBy?: 'words' | 'chars';
  direction?: 'top' | 'bottom';
  delay?: number;
}

export default function BlurText({ text, className, animateBy = 'words', direction = 'top', delay = 80 }: BlurTextProps) {
  const reduced = usePrefersReducedMotion();
  const items = animateBy === 'words' ? text.split(' ') : Array.from(text);
  const y = direction === 'top' ? -12 : 12;
  return (
    <h1 className={cn('flex flex-wrap', className)} aria-label={text}>
      {items.map((item, i) => (
        <motion.span
          key={`${item}-${i}`}
          className="inline-block"
          style={{ marginRight: animateBy === 'words' ? '0.25em' : undefined } as CSSProperties}
          initial={reduced ? { opacity: 1 } : { opacity: 0, filter: 'blur(8px)', y }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : (i * delay) / 1000, ease: 'easeOut' }}
        >
          {item === ' ' ? '\u00A0' : item}
        </motion.span>
      ))}
    </h1>
  );
}
