import { useCallback, useEffect, useState } from 'react';
import { Check, Flame, Layers, Timer, BrainCircuit, Circle } from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { cn } from '../lib/utils';
import { getGenericLocalDB, saveGenericLocalDB, clearGenericLocalDB } from '../services/storageManager';

interface Quest {
  id: string;
  title: string;
  description: string;
  rewardXP: number;
  rewardEmbers: number;
  iconType: 'timer' | 'brain' | 'layers';
  target: number;
  current: number;
  completed: boolean;
}

const questIcons = {
  timer: Timer,
  brain: BrainCircuit,
  layers: Layers,
};

export function DailyQuests() {
  useForgeStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [, setLastReset] = useState<string | null>(null);

  const refreshQuests = useCallback(() => {
    getGenericLocalDB('forge_quests_data').then(saved => {
      if (saved) {
        try {
          if (saved.length > 0 && !saved[0].iconType) {
            clearGenericLocalDB('forge_quests_data');
            setQuests([]);
            return;
          }
          setQuests(saved);
        } catch {
          clearGenericLocalDB('forge_quests_data');
        }
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const today = new Date().toISOString().split('T')[0];

    getGenericLocalDB('forge_quests_reset').then(reset => {
      if (!isMounted) return;
      setLastReset((reset as string | null) ?? null);

      if (reset !== today) {
        const dailyQuests: Quest[] = [
          { id: 'focus_session', title: 'Deep work', description: 'Focus for 25 minutes', rewardXP: 100, rewardEmbers: 20, iconType: 'timer', target: 1, current: 0, completed: false },
          { id: 'quiz_master', title: 'Test yourself', description: 'Score 100% on any quiz', rewardXP: 150, rewardEmbers: 30, iconType: 'brain', target: 1, current: 0, completed: false },
          { id: 'card_flip', title: 'Recall practice', description: 'Review 10 flashcards', rewardXP: 50, rewardEmbers: 10, iconType: 'layers', target: 10, current: 0, completed: false },
        ];
        setQuests(dailyQuests);
        setLastReset(today);
        saveGenericLocalDB('forge_quests_reset', today);
        saveGenericLocalDB('forge_quests_data', dailyQuests);
      } else {
        refreshQuests();
      }
    });

    window.addEventListener('forge_quests_updated', refreshQuests);
    return () => {
      isMounted = false;
      window.removeEventListener('forge_quests_updated', refreshQuests);
    };
  }, [refreshQuests]);

  const completedCount = quests.filter(q => q.completed).length;
  const allCompleted = quests.length > 0 && completedCount === quests.length;

  return (
    <section className="sf-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="sf-eyebrow">Daily goals</p>
          <h2 className="sf-card-title mt-2">Small wins that build the habit</h2>
        </div>
        <span className="sf-chip">
          <Flame aria-hidden="true" size={13} className={allCompleted ? 'text-[var(--sf-orange-300)]' : 'text-[var(--sf-text-subtle)]'} />
          {completedCount} / {quests.length} done
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {quests.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-[var(--sf-border)] px-5 py-6 text-center text-[13px] text-[var(--sf-text-subtle)]">
            Today&rsquo;s goals are being prepared.
          </p>
        ) : (
          quests.map((quest) => {
            const Icon = questIcons[quest.iconType] ?? Circle;
            const pct = Math.min(100, Math.round((quest.current / Math.max(quest.target, 1)) * 100));
            return (
              <div
                key={quest.id}
                className={cn(
                  'relative overflow-hidden rounded-[12px] border px-4 py-3.5 transition-colors',
                  quest.completed
                    ? 'border-[var(--sf-success)]/25 bg-[var(--sf-success-soft)]'
                    : 'border-[var(--sf-border)] bg-white/[0.02]',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-[10px]',
                      quest.completed
                        ? 'bg-[var(--sf-success)]/15 text-emerald-300'
                        : 'bg-[var(--sf-orange-500)]/10 text-[var(--sf-orange-300)]',
                    )}
                  >
                    {quest.completed ? <Check aria-hidden="true" size={17} /> : <Icon aria-hidden="true" size={17} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className={cn('text-[13.5px] font-medium', quest.completed ? 'text-emerald-200' : 'text-white')}>{quest.title}</p>
                      <p className="text-[11px] text-[var(--sf-text-subtle)]">
                        {quest.completed ? 'Done' : `${quest.current}/${quest.target}`} &middot; {quest.rewardXP} XP
                      </p>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--sf-text-subtle)]">{quest.description}</p>
                  </div>
                </div>

                {!quest.completed && pct > 0 && (
                  <div className="sf-progress mt-3 h-1">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {quests.length > 0 && (
        <p className="mt-4 text-[11.5px] text-[var(--sf-text-disabled)]">
          Resets in {Math.max(0, Math.floor((new Date().setHours(24, 0, 0, 0) - Date.now()) / 3_600_000))} hours.
        </p>
      )}
    </section>
  );
}
