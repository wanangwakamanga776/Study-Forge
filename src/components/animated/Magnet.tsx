import { useRef, type ReactNode, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { usePrefersReducedMotion } from '../../lib/motion';
import { cn } from '../../lib/utils';

interface MagnetProps {
  children: ReactNode;
  className?: string;
  magnitude?: number;
  maxDistance?: number;
  damping?: number;
  stiffness?: number;
}

export function Magnet({
  children,
  className,
  magnitude = 0.3,
  maxDistance = 150,
  damping = 25,
  stiffness = 200,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping, stiffness });
  const springY = useSpring(y, { damping, stiffness });

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = event.clientX - centerX;
    const distanceY = event.clientY - centerY;
    const distance = Math.hypot(distanceX, distanceY);
    if (distance > maxDistance) {
      x.set(0);
      y.set(0);
      return;
    }
    x.set(distanceX * magnitude);
    y.set(distanceY * magnitude);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  );
}
