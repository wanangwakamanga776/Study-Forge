import { useState } from 'react';
import { cn } from '../../lib/utils';

interface InteractiveGridPatternProps {
  width?: number;
  height?: number;
  squares?: [number, number];
  squaresClassName?: string;
  className?: string;
}

export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  squaresClassName,
  className,
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const column = index % horizontal;
        const row = Math.floor(index / horizontal);
        return (
          <rect
            key={index}
            width={width}
            height={height}
            x={column * width}
            y={row * height}
            className={cn(
              'pointer-events-auto stroke-white/[0.06] transition-all duration-100 ease-in-out not-[hover]:fill-transparent',
              hovered === index ? 'fill-[var(--sf-orange-500)]/10' : 'fill-transparent',
              squaresClassName,
            )}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
    </svg>
  );
}
