/**
 * The only module allowed to import `ts-fsrs`.
 * Pinned to ts-fsrs v6 (DefaultScheduler API: newCard / review / preview).
 * The library's published types lag its runtime card shape, so we describe the
 * runtime contract locally. `CardSchedule` mirrors `card_state`; `fsrs` keeps the
 * full library card so a future version can resume without losing fields.
 */
import { DefaultScheduler, Rating, type Grade } from 'ts-fsrs';

export type RatingLabel = 'forgot' | 'tough' | 'gotit' | 'easy';

export interface FsrsCard {
  stability: number;
  stabilityFast?: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: string;
  lastReviewAt: string | null;
  cardId: string | number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
}

export interface CardSchedule {
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  fsrs?: FsrsCard | null;
}

interface SchedulerApi {
  newCard(options: { now: Date }): FsrsCard;
  review(options: { card: FsrsCard; now: Date; grade: Grade }): { card: FsrsCard; revlog: unknown };
  preview(options: { card: FsrsCard; now: Date }): {
    map: <T>(fn: (item: { grade: number; card: FsrsCard }) => T) => T[];
  };
}

const GRADES: Record<RatingLabel, Grade> = {
  forgot: Rating.Again,
  tough: Rating.Hard,
  gotit: Rating.Good,
  easy: Rating.Easy,
};

let schedulerPromise: Promise<SchedulerApi> | null = null;

function getScheduler(): Promise<SchedulerApi> {
  if (!schedulerPromise) {
    schedulerPromise = DefaultScheduler({ version: 'FSRS-6' }) as unknown as Promise<SchedulerApi>;
  }
  return schedulerPromise;
}

export function emptyCardSchedule(now = new Date()): CardSchedule {
  return {
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
    fsrs: null,
  };
}

function fromSchedule(schedule: CardSchedule): FsrsCard {
  if (schedule.fsrs) return schedule.fsrs;
  return {
    dueAt: schedule.due,
    stability: schedule.stability,
    stabilityFast: schedule.stability,
    difficulty: schedule.difficulty,
    state: schedule.state,
    scheduleStatus: schedule.state === 0 ? 'new' : 'review',
    lastReviewAt: schedule.last_review,
    cardId: 'card-state',
    reps: schedule.reps,
    lapses: schedule.lapses,
    scheduledDays: 0,
    learningStep: 0,
  };
}

function toSchedule(card: FsrsCard): CardSchedule {
  return {
    due: card.dueAt,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    state: Number(card.state),
    last_review: card.lastReviewAt ?? null,
    fsrs: card,
  };
}

export async function newCardSchedule(now = new Date()): Promise<CardSchedule> {
  const scheduler = await getScheduler();
  return toSchedule(scheduler.newCard({ now }));
}

export async function scheduleReview(
  schedule: CardSchedule | null,
  rating: RatingLabel,
  now = new Date(),
): Promise<{ schedule: CardSchedule; grade: Grade }> {
  const scheduler = await getScheduler();
  const grade = GRADES[rating];
  const card = schedule ? fromSchedule(schedule) : scheduler.newCard({ now });
  const result = scheduler.review({ card, now, grade });
  return { schedule: toSchedule(result.card), grade };
}

export async function previewIntervals(
  schedule: CardSchedule | null,
  now = new Date(),
): Promise<Record<RatingLabel, string>> {
  const scheduler = await getScheduler();
  const card = schedule ? fromSchedule(schedule) : scheduler.newCard({ now });
  const preview = scheduler.preview({ card, now });
  const items = preview.map((item) => item);
  const labels: Record<RatingLabel, string> = { forgot: '', tough: '', gotit: '', easy: '' };
  for (const key of Object.keys(labels) as RatingLabel[]) {
    const item = items.find((entry) => entry.grade === GRADES[key]);
    labels[key] = item ? formatInterval(now, new Date(item.card.dueAt)) : '';
  }
  return labels;
}

export function formatInterval(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

export function isDue(schedule: CardSchedule | null, now = new Date()): boolean {
  if (!schedule) return true;
  return new Date(schedule.due).getTime() <= now.getTime();
}
