import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { usePrefersReducedMotion } from '../../lib/motion';
import { cn } from '../../lib/utils';

export interface DockItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface DockProps {
  items: DockItem[];
  spring?: { mass: number; stiffness: number; damping: number };
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  className?: string;
}

export function Dock({
  items,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 60,
  distance = 140,
  panelHeight = 64,
  baseItemSize = 48,
  className,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const reduced = usePrefersReducedMotion();

  return (
    <div
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'flex items-end gap-2 rounded-2xl border border-white/10 bg-[#12110f]/90 px-3 py-2 shadow-2xl backdrop-blur-xl',
        className,
      )}
      style={{ height: panelHeight }}
    >
      {items.map((item, index) => (
        <DockIcon
          key={`${item.label}-${index}`}
          item={item}
          mouseX={mouseX}
          baseItemSize={baseItemSize}
          magnification={magnification}
          distance={distance}
          spring={spring}
          reduced={reduced}
        />
      ))}
    </div>
  );
}

function DockIcon({
  item,
  mouseX,
  baseItemSize,
  magnification,
  distance,
  spring,
  reduced,
}: {
  item: DockItem;
  mouseX: MotionValue<number>;
  baseItemSize: number;
  magnification: number;
  distance: number;
  spring: { mass: number; stiffness: number; damping: number };
  reduced: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const distanceFromMouse = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value === Infinity ? Infinity : value - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(
    distanceFromMouse,
    [-distance, 0, distance],
    [baseItemSize, baseItemSize + magnification, baseItemSize],
  );
  const width = useSpring(widthSync, reduced ? { stiffness: 1000, damping: 100, mass: 0.01 } : spring);

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width: reduced ? baseItemSize : width, height: reduced ? baseItemSize : width }}
      onClick={item.onClick}
      className={cn(
        'group relative grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-[var(--sf-text-muted)] transition-colors hover:border-[var(--sf-orange-400)]/40 hover:bg-[var(--sf-orange-500)]/15 hover:text-white',
        item.className,
      )}
      aria-label={item.label}
    >
      {item.icon}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {item.label}
      </span>
    </motion.button>
  );
}
