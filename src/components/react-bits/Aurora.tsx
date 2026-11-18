import { usePrefersReducedMotion } from '../../lib/motion';

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  opacity?: number;
  paused?: boolean;
}

export default function Aurora({
  colorStops = ['#7c2d12', '#f97316', '#fed7aa'],
  speed = 0.35,
  opacity = 0.65,
  paused,
}: AuroraProps) {
  const reduced = usePrefersReducedMotion();
  const isPaused = paused ?? reduced;
  const [a, b, c] = colorStops;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ opacity }}
      aria-hidden="true"
    >
      <div
        className="absolute -inset-[30%] blur-3xl"
        style={{
          background: `radial-gradient(ellipse at 20% 30%, ${a} 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${b} 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, ${c} 0%, transparent 50%)`,
          animation: isPaused ? 'none' : `sf-aurora ${12 / Math.max(speed, 0.1)}s ease-in-out infinite alternate`,
        }}
      />
      <style>{`@keyframes sf-aurora { 0% { transform: translate3d(-2%, -1%, 0) scale(1); } 100% { transform: translate3d(2%, 2%, 0) scale(1.08); } }`}</style>
    </div>
  );
}
