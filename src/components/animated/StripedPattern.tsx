import { cn } from '../../lib/utils';

interface StripedPatternProps {
  direction?: 'left' | 'right';
  width?: number;
  height?: number;
  className?: string;
}

export function StripedPattern({ direction = 'left', width = 10, height = 10, className }: StripedPatternProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        backgroundImage: `repeating-linear-gradient(${direction === 'left' ? '45deg' : '-45deg'}, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent ${width}px)`,
        backgroundSize: `${width}px ${height}px`,
      }}
    />
  );
}
