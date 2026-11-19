import { type CSSProperties } from 'react';
import { cn } from '../../lib/utils';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#fb923c',
  colorTo = '#fdba74',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] p-[var(--border-width)]',
        '[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude]',
        className,
      )}
      style={
        {
          '--border-width': `${borderWidth}px`,
        } as CSSProperties
      }
    >
      <div
        className="h-full w-full rounded-[inherit] animate-border-beam"
        style={
          {
            background: `conic-gradient(from 0deg, transparent 0 62%, ${colorFrom} 82%, ${colorTo} 90%, transparent 100%)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            maskImage: 'radial-gradient(farthest-side, transparent calc(100% - var(--mask-spread, 40%)), #000 calc(100% - var(--mask-spread, 40%)))',
          } as CSSProperties
        }
      />
    </div>
  );
}
