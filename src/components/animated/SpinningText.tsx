import { useId } from 'react';
import { cn } from '../../lib/utils';

interface SpinningTextProps {
  children: string;
  radius?: number;
  duration?: number;
  reverse?: boolean;
  className?: string;
}

export function SpinningText({ children, radius = 60, duration = 12, reverse = false, className }: SpinningTextProps) {
  const id = useId().replace(/:/g, '');
  const size = radius * 2 + 40;
  const center = size / 2;
  const path = `M ${center}, ${center} m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
      aria-label={children}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('animate-spin-slow', reverse && '[animation-direction:reverse]')}
        style={{ animationDuration: `${duration}s` }}
        aria-hidden="true"
      >
        <defs>
          <path id={id} d={path} />
        </defs>
        <text className="fill-current text-[11px] font-semibold uppercase tracking-[0.28em]">
          <textPath href={`#${id}`}>{children}</textPath>
        </text>
      </svg>
    </div>
  );
}
