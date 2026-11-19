import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '../../lib/motion';
import { cn } from '../../lib/utils';

interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

interface Square {
  id: number;
  pos: [number, number];
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
}: AnimatedGridPatternProps) {
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState<Square[]>([]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    const make = (): Square => ({
      id: Math.random(),
      pos: [
        Math.floor((Math.random() * dimensions.width) / width),
        Math.floor((Math.random() * dimensions.height) / height),
      ],
    });
    setSquares(Array.from({ length: numSquares }, make));
  }, [dimensions.width, dimensions.height, numSquares, width, height]);

  useEffect(() => {
    if (reduced || !dimensions.width || !dimensions.height) return;
    const interval = window.setInterval(() => setCycle((value) => value + 1), (duration + repeatDelay) * 1000);
    return () => window.clearInterval(interval);
  }, [reduced, dimensions.width, dimensions.height, duration, repeatDelay]);

  useEffect(() => {
    if (cycle === 0 || !dimensions.width || !dimensions.height) return;
    setSquares((current) =>
      current.map((square) => ({
        id: square.id,
        pos: [
          Math.floor((Math.random() * dimensions.width) / width),
          Math.floor((Math.random() * dimensions.height) / height),
        ],
      })),
    );
  }, [cycle, dimensions.width, dimensions.height, width, height]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full fill-white/[0.035] stroke-white/[0.08]',
        className,
      )}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {squares.map(({ pos: [sx, sy], id: squareId }) => (
        <motion.rect
          key={squareId}
          width={width - 1}
          height={height - 1}
          x={sx * width + 1}
          y={sy * height + 1}
          initial={{ opacity: 0 }}
          animate={{ opacity: maxOpacity }}
          transition={{ duration: reduced ? 0 : 1.2, repeat: reduced ? 0 : Infinity, repeatType: 'reverse', delay: reduced ? 0 : squareId % 2 }}
          style={{ fill: 'currentColor' }}
        />
      ))}
    </svg>
  );
}
