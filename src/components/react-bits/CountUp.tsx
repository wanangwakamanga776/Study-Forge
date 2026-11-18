import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'motion/react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  separator?: string;
  className?: string;
}

export default function CountUp({ to, from = 0, duration = 1, separator = '', className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (inView) motionValue.set(to);
  }, [inView, motionValue, to]);

  useEffect(() => {
    const unsub = spring.on('change', (latest) => setValue(Math.round(latest)));
    return () => unsub();
  }, [spring]);

  const formatted = separator ? value.toLocaleString() : String(value);
  return <span ref={ref} className={className}>{formatted}</span>;
}
