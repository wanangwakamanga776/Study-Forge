/**
 * Structured lesson/outline contracts from the blueprint (section 5.2).
 * Generated JSON is untrusted: validate before storing or rendering.
 */

export interface LessonCard {
  front: string;
  explanation?: string;
  application?: string;
}

export interface HookBlock {
  type: 'hook' | 'explain' | 'example';
  text: string;
  cites?: string[];
}

export interface CheckBlock {
  type: 'check';
  kind: 'mcq' | 'recall';
  q: string;
  options?: string[];
  answer?: number | string;
  why?: string;
}

export type LessonBlock = HookBlock | CheckBlock;

export interface Lesson {
  title: string;
  estMinutes: number;
  blocks: LessonBlock[];
  cards: LessonCard[];
}

export interface OutlineUnit {
  title: string;
  topics: string[];
}

export interface Outline {
  title: string;
  units: OutlineUnit[];
}

export interface LessonValidationOptions {
  sourceGrounded?: boolean;
  minChecks?: number;
  maxMinutes?: number;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function validateLesson(value: unknown, options: LessonValidationOptions = {}): ValidationResult<Lesson> {
  const errors: string[] = [];
  const { sourceGrounded = false, minChecks = 3, maxMinutes = 6 } = options;

  if (!isRecord(value)) return { ok: false, errors: ['Lesson must be an object.'] };

  if (!text(value.title)) errors.push('Lesson needs a title.');
  if (typeof value.estMinutes !== 'number' || !Number.isFinite(value.estMinutes) || value.estMinutes <= 0) {
    errors.push('Lesson needs estMinutes > 0.');
  } else if (value.estMinutes > maxMinutes) {
    errors.push(`Lesson is longer than ${maxMinutes} minutes.`);
  }

  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  if (blocks.length === 0) errors.push('Lesson needs blocks.');
  if (!Array.isArray(value.cards)) errors.push('Lesson needs a cards array.');

  let checks = 0;
  blocks.forEach((block, index) => {
    if (!isRecord(block)) {
      errors.push(`Block ${index} is not an object.`);
      return;
    }
    const type = block.type;
    if (type === 'hook' || type === 'explain' || type === 'example') {
      if (!text(block.text)) errors.push(`Block ${index} needs text.`);
      if (sourceGrounded && type === 'explain') {
        const cites = Array.isArray(block.cites) ? block.cites.filter((c) => typeof c === 'string') : [];
        if (cites.length === 0) errors.push(`Block ${index} (explain) needs citations on a grounded forge.`);
      }
      return;
    }
    if (type === 'check') {
      checks++;
      if (!text(block.q)) errors.push(`Check ${index} needs a question.`);
      if (block.kind === 'mcq') {
        const options = Array.isArray(block.options) ? block.options : [];
        if (options.length < 2) errors.push(`Check ${index} needs at least 2 options.`);
        if (typeof block.answer !== 'number' || block.answer < 0 || block.answer >= options.length) {
          errors.push(`Check ${index} has an invalid answer index.`);
        }
      } else if (block.kind === 'recall') {
        if (!text(block.answer)) errors.push(`Recall ${index} needs an answer.`);
      } else {
        errors.push(`Check ${index} has an unknown kind.`);
      }
      return;
    }
    errors.push(`Block ${index} has an unknown type.`);
  });

  if (checks < minChecks) errors.push(`Lesson needs at least ${minChecks} checks (found ${checks}).`);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: value as unknown as Lesson, errors: [] };
}

export function parseOutline(value: unknown): ValidationResult<Outline> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['Outline must be an object.'] };
  if (!text(value.title)) errors.push('Outline needs a title.');
  const units = Array.isArray(value.units) ? value.units : [];
  if (units.length === 0) errors.push('Outline needs at least one unit.');

  units.forEach((unit, index) => {
    if (!isRecord(unit) || !text(unit.title)) {
      errors.push(`Unit ${index} needs a title.`);
      return;
    }
    const topics = Array.isArray(unit.topics) ? unit.topics.filter((t) => typeof t === 'string' && t.trim()) : [];
    if (topics.length === 0) errors.push(`Unit ${index} needs topics.`);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: value as unknown as Outline, errors: [] };
}

/** Parse a model response that may include surrounding prose or code fences. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Response did not contain JSON.');
  }
}
