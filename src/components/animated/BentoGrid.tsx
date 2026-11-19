import { type ElementType, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  description: string;
  className?: string;
  background?: ReactNode;
  Icon?: ElementType;
  cta?: string;
  onClick?: () => void;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn('grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  );
}

export function BentoCard({ name, description, className, background, Icon, cta, onClick }: BentoCardProps) {
  return (
    <div className={cn('group relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6 transition hover:border-[var(--sf-orange-400)]/30', className)}>
      {background && <div className="pointer-events-none absolute inset-0 opacity-70">{background}</div>}
      <div className="relative flex h-full flex-col justify-between">
        <div>
          {Icon && (
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[var(--sf-orange-500)]/15 text-[var(--sf-orange-300)]">
              <Icon size={20} aria-hidden="true" />
            </span>
          )}
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--sf-text-muted)]">{description}</p>
        </div>
        {cta && (
          <button
            type="button"
            onClick={onClick}
            className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--sf-orange-300)] hover:text-white"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
