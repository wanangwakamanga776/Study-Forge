import { Children, createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepperContextValue {
  current: number;
  total: number;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
}

const StepperContext = createContext<StepperContextValue | null>(null);

interface StepperProps {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  backButtonText?: string;
  nextButtonText?: string;
  className?: string;
  contentClassName?: string;
}

export function Stepper({
  children,
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  className,
  contentClassName,
}: StepperProps) {
  const steps = Children.toArray(children);
  const total = steps.length;
  const [current, setCurrent] = useState(Math.min(Math.max(initialStep, 1), total));

  const value = useMemo<StepperContextValue>(
    () => ({
      current,
      total,
      next: () => {
        if (current >= total) {
          onFinalStepCompleted?.();
          return;
        }
        const nextStep = current + 1;
        setCurrent(nextStep);
        onStepChange?.(nextStep);
      },
      back: () => {
        if (current <= 1) return;
        const previous = current - 1;
        setCurrent(previous);
        onStepChange?.(previous);
      },
      goTo: (step: number) => {
        const clamped = Math.min(Math.max(step, 1), total);
        setCurrent(clamped);
        onStepChange?.(clamped);
      },
    }),
    [current, total, onStepChange, onFinalStepCompleted],
  );

  return (
    <StepperContext.Provider value={value}>
      <div className={cn('rounded-3xl border border-white/10 bg-[var(--sf-surface)] p-6', className)}>
        <div className="mb-6 flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
          {Array.from({ length: total }).map((_, index) => {
            const step = index + 1;
            const active = step === current;
            const complete = step < current;
            return (
              <button
                key={step}
                type="button"
                onClick={() => value.goTo(step)}
                aria-label={`Go to step ${step}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  complete || active ? 'bg-[var(--sf-orange-500)]' : 'bg-white/10 hover:bg-white/20',
                )}
              />
            );
          })}
        </div>
        <div className={cn('min-h-40', contentClassName)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {steps[current - 1]}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={value.back}
            disabled={current === 1}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-[var(--sf-text-muted)] hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {backButtonText}
          </button>
          <button
            type="button"
            onClick={value.next}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 text-sm font-semibold text-black hover:bg-[var(--sf-orange-400)]"
          >
            {current === total ? 'Finish' : nextButtonText} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </StepperContext.Provider>
  );
}

export function Step({ children }: { children: ReactNode }) {
  const context = useContext(StepperContext);
  if (!context) throw new Error('Step must be used within Stepper');
  return <div>{children}</div>;
}
