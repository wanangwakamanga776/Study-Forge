import { cn } from '../../lib/utils';

interface PlasmaProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  blur?: number;
  className?: string;
}

export function Plasma({
  color1 = '#f97316',
  color2 = '#7c2d12',
  color3 = '#fbbf24',
  speed = 1,
  blur = 60,
  className,
}: PlasmaProps) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute -inset-1/4 animate-plasma opacity-60"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color1} 0%, transparent 45%), radial-gradient(circle at 70% 60%, ${color2} 0%, transparent 45%), radial-gradient(circle at 50% 85%, ${color3} 0%, transparent 45%)`,
          filter: `blur(${blur}px)`,
          animationDuration: `${16 / Math.max(speed, 0.2)}s`,
        }}
      />
      <div className="absolute inset-0 bg-[var(--sf-bg)]/40" />
    </div>
  );
}
