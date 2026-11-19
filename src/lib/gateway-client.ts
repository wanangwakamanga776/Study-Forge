import { supabase } from './supabase';

export type Task = 'outline' | 'lesson' | 'cards' | 'mcq' | 'ask' | 'mark';

export const CREDIT_COSTS: Record<Task, number> = {
  outline: 5,
  lesson: 2,
  cards: 1,
  mcq: 1,
  ask: 1,
  mark: 2,
};

export const DAILY_GRANT = 20;
export const DAILY_GRANT_CAP = 60;

export interface GatewayRequest {
  task: Task;
  input: Record<string, unknown>;
  promptVersion?: string;
  maxOutputTokens?: number;
  /** Anything derived from an upload or chat. Disables the shared public cache. */
  sensitive?: boolean;
  /** Send a stable key so a retry is not charged twice. */
  idemKey?: string;
}

export interface GatewaySuccess<T = unknown> {
  json: T;
  cached: boolean;
  creditsRemaining: number;
  tokensIn: number;
  tokensOut: number;
  model?: string;
}

export type GatewayErrorCode =
  | 'not_configured'
  | 'auth'
  | 'credits'
  | 'spend_cap'
  | 'validation'
  | 'provider'
  | 'network'
  | 'unknown';

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly status: number;

  constructor(code: GatewayErrorCode, message: string, status = 500) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.status = status;
  }
}

const isConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && /^https?:\/\//i.test(url) && key && key !== 'YOUR_SUPABASE_ANON_KEY');
};

export function gatewayConfigured(): boolean {
  return isConfigured();
}

const CODE_BY_STATUS: Record<number, GatewayErrorCode> = {
  401: 'auth',
  402: 'credits',
  429: 'spend_cap',
  422: 'validation',
  502: 'provider',
};

export async function generate<T = unknown>(request: GatewayRequest): Promise<GatewaySuccess<T>> {
  if (!isConfigured()) {
    throw new GatewayError('not_configured', 'The AI gateway is not configured for this build.', 503);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new GatewayError('auth', 'Sign in to generate new study material.', 401);
  }

  const { data, error } = await supabase.functions.invoke('generate', {
    body: {
      task: request.task,
      input: request.input,
      promptVersion: request.promptVersion ?? 'v1',
      maxOutputTokens: request.maxOutputTokens,
      sensitive: request.sensitive ?? false,
      idemKey: request.idemKey,
    },
  });

  if (error) {
    let status = 500;
    let code: GatewayErrorCode = 'unknown';
    let message = error.message || 'The tutor could not respond.';

    const context = (error as { context?: Response }).context;
    if (context && typeof context.status === 'number') {
      status = context.status;
      code = CODE_BY_STATUS[status] ?? 'unknown';
      try {
        const body = await context.clone().json() as { error?: { code?: string; message?: string } };
        if (body?.error?.code) code = body.error.code as GatewayErrorCode;
        if (body?.error?.message) message = body.error.message;
      } catch {
        /* keep defaults */
      }
    }

    throw new GatewayError(code, message, status);
  }

  const payload = data as {
    json?: T;
    cached?: boolean;
    creditsRemaining?: number;
    tokensIn?: number;
    tokensOut?: number;
    model?: string;
    error?: { code?: string; message?: string };
  };

  if (!payload || payload.json === undefined) {
    throw new GatewayError('provider', payload?.error?.message || 'Empty gateway response.', 502);
  }

  return {
    json: payload.json,
    cached: Boolean(payload.cached),
    creditsRemaining: payload.creditsRemaining ?? 0,
    tokensIn: payload.tokensIn ?? 0,
    tokensOut: payload.tokensOut ?? 0,
    model: payload.model,
  };
}

/** Stable idempotency key for one user action (e.g. opening a lesson). */
export async function idemKey(parts: Array<string | number>): Promise<string> {
  const text = parts.join('|');
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  }
  return text.replace(/[^a-z0-9]/gi, '').slice(0, 40);
}
