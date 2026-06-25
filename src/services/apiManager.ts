import { get, set, del, update, createStore, entries } from 'idb-keyval';
import { generateId } from "../lib/utils";

// ─────────────────────────────────────────────────────────────────
// SECTION 1 — CONFIGURATION
// ─────────────────────────────────────────────────────────────────

export const CONFIG = {
  API_KEY: process.env.GEMINI_API_KEY || (import.meta.env.VITE_GEMINI_API_KEY as string) || '',

  MODELS: {
    flash: 'gemini-3.5-flash',
    pro:   'gemini-3.5-flash', 
  },

  // How long generated content lives in cache (milliseconds)
  CACHE_TTL: {
    flashcards:    1000 * 60 * 60 * 24 * 7,  // 7 days
    quiz:          1000 * 60 * 60 * 24 * 3,  // 3 days
    audit:         1000 * 60 * 60 * 24 * 7,  // 7 days
    forgecast:     1000 * 60 * 60 * 24 * 7,  // 7 days
    pyra:          0,                          // 0 = never cache
    exam_simulator: 0,                         // 0 = never cache, always fresh
    study_guide:   0,                          // 0 = never cache, always fresh
    progression:   1000 * 60 * 5,             // 5 min
    embers:        1000 * 60 * 2,             // 2 min
    hints:         1000 * 60 * 60 * 24,      // 1 day
    atmosphere:    1000 * 60 * 60 * 24,      // 1 day
    study_material: 1000 * 60 * 60 * 24 * 7, // 7 days
  },

  // Max tokens per call type
  MAX_TOKENS: {
    flashcards:    4096,
    quiz:          4096,
    audit:         8192,
    forgecast:     4096,
    pyra:          1500,
    exam_simulator: 8192,
    study_guide:   8192,
    progression:   2048,
    hints:         256,
    embers:        512,
    atmosphere:    1024,
    study_material: 4096,
  },

  PYRA_MAX_HISTORY: 20,
  BUTTON_COOLDOWN: 3000,
  USER_HOURLY_LIMIT: 30,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1500,
  DEBUG: false,
};

// ─────────────────────────────────────────────────────────────────
// SECTION 2 — CACHE MANAGER
// ─────────────────────────────────────────────────────────────────

const customStore = createStore('forge_api_cache', 'responses');

export const CacheManager = {
  async get(type: string, content: any) {
    const ttl = (CONFIG.CACHE_TTL as any)[type];
    if (ttl === 0) return null;
    
    const key = this.buildKey(type, content);
    try {
      const entry: any = await get(key, customStore);
      if (!entry) return null;
      
      if (Date.now() > entry.expires) {
        await del(key, customStore);
        return null;
      }
      return entry.data;
    } catch (e) {
      console.warn('[Cache] read error:', e);
      return null;
    }
  },

  async set(type: string, content: any, data: any) {
    const ttl = (CONFIG.CACHE_TTL as any)[type];
    if (ttl === 0) return;
    
    const key = this.buildKey(type, content);
    try {
      await set(key, {
        data,
        expires: Date.now() + ttl,
        created: Date.now(),
        type,
      }, customStore);
    } catch (e) {
      console.warn('[Cache] write error:', e);
    }
  },

  buildKey(type: string, content: any) {
    const str = `${type}::${typeof content === 'string' ? content : JSON.stringify(content)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `${type}_${Math.abs(hash)}`;
  },

  async purgeExpired() {
    try {
      const allEntries = await entries(customStore);
      for (const [key, val] of allEntries) {
        if ((val as any).expires && Date.now() > (val as any).expires) {
          await del(key, customStore);
        }
      }
    } catch (e) { /* silent */ }
  },

  async invalidateType(type: string) {
    try {
      const allEntries = await entries(customStore);
      for (const [key, val] of allEntries) {
        if ((val as any).type === type) {
          await del(key, customStore);
        }
      }
    } catch (e) { /* silent */ }
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 3 — RATE LIMITER
// ─────────────────────────────────────────────────────────────────

export const RateLimiter = {
  KEY: 'forge_rate',

  getRecord() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : { count: 0, window_start: Date.now() };
    } catch { return { count: 0, window_start: Date.now() }; }
  },

  saveRecord(rec: any) {
    try { localStorage.setItem(this.KEY, JSON.stringify(rec)); } catch { /* silent */ }
  },

  check() {
    let rec = this.getRecord();
    const now = Date.now();
    const oneHour = 1000 * 60 * 60;

    if (now - rec.window_start > oneHour) {
      rec = { count: 0, window_start: now };
    }

    if (rec.count >= CONFIG.USER_HOURLY_LIMIT) {
      const resetIn = Math.ceil((rec.window_start + oneHour - now) / 60000);
      return { allowed: false, resetInMinutes: resetIn, used: rec.count };
    }

    return { allowed: true, used: rec.count, remaining: CONFIG.USER_HOURLY_LIMIT - rec.count };
  },

  increment() {
    let rec = this.getRecord();
    const now = Date.now();
    const oneHour = 1000 * 60 * 60;
    if (now - rec.window_start > oneHour) {
      rec = { count: 0, window_start: now };
    }
    rec.count += 1;
    this.saveRecord(rec);
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 4 — DEDUPLICATION MANAGER
// ─────────────────────────────────────────────────────────────────

const pendingRequests = new Map<string, Promise<any>>();

export const InFlight = {
  getOrCreate(key: string, factory: () => Promise<any>) {
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }
    const promise = factory().finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, promise);
    return promise;
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 5 — BUTTON GUARD
// ─────────────────────────────────────────────────────────────────

const cooldowns = new Map<string, number>();

export const ButtonGuard = {
  checkAndSet(buttonId: string) {
    const last = cooldowns.get(buttonId) || 0;
    const now = Date.now();
    if (now - last < CONFIG.BUTTON_COOLDOWN) {
      return false;
    }
    cooldowns.set(buttonId, now);
    return true;
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 6 — CORE API CALLER
// ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public code: string, message: string, public retryable: boolean) {
    super(message);
  }
}

// Safe JSON parser — handles markdown fences and truncation
function safeParseJSON<T>(text: string, context: string): T {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  clean = clean.trim();

  // Try direct parse first
  try {
    return JSON.parse(clean) as T;
  } catch (initialError) {
    console.warn(`[SafeParse] Initial parse failed for context: ${context}, attempting advanced recovery...`);

    // Recovery Phase 1: Stack-based string/structure balancing
    let textToProcess = clean;
    let inString = false;
    let isEscaped = false;
    let stack: ('{' | '[')[] = [];

    for (let i = 0; i < textToProcess.length; i++) {
      const char = textToProcess[i];
      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          stack.push('{');
        } else if (char === '[') {
          stack.push('[');
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
          }
        }
      }
    }

    if (inString) {
      textToProcess += '"';
    }

    // Strip trailing incomplete syntax patterns
    textToProcess = textToProcess.replace(/,\s*$/, '').replace(/:\s*$/, '').replace(/,\s*$/, '');

    let balanced = textToProcess;
    for (let j = stack.length - 1; j >= 0; j--) {
      const openChar = stack[j];
      if (openChar === '{') {
        balanced += '}';
      } else if (openChar === '[') {
        balanced += ']';
      }
    }

    try {
      return JSON.parse(balanced) as T;
    } catch {
      console.warn(`[SafeParse] Stack balancing failed for ${context}, executing Phase 2 (structural slicing)...`);
    }

    // Recovery Phase 2: Slice to the last completed item boundary
    const lastBraceIndex = clean.lastIndexOf('}');
    const lastBracketIndex = clean.lastIndexOf(']');
    const cutPoint = Math.max(lastBraceIndex, lastBracketIndex);

    if (cutPoint > 0) {
      let sliced = clean.substring(0, cutPoint + 1).trim();
      sliced = sliced.replace(/,\s*$/, '');

      let sStack: ('{' | '[')[] = [];
      let sInString = false;
      let sIsEscaped = false;

      for (let k = 0; k < sliced.length; k++) {
        const char = sliced[k];
        if (sInString) {
          if (sIsEscaped) {
            sIsEscaped = false;
          } else if (char === '\\') {
            sIsEscaped = true;
          } else if (char === '"') {
            sInString = false;
          }
        } else {
          if (char === '"') {
            sInString = true;
          } else if (char === '{') {
            sStack.push('{');
          } else if (char === '[') {
            sStack.push('[');
          } else if (char === '}') {
            if (sStack[sStack.length - 1] === '{') {
              sStack.pop();
            }
          } else if (char === ']') {
            if (sStack[sStack.length - 1] === '[') {
              sStack.pop();
            }
          }
        }
      }

      if (sInString) sliced += '"';
      sliced = sliced.replace(/,\s*$/, '');

      for (let j = sStack.length - 1; j >= 0; j--) {
        const openChar = sStack[j];
        if (openChar === '{') {
          sliced += '}';
        } else if (openChar === '[') {
          sliced += ']';
        }
      }

      try {
        return JSON.parse(sliced) as T;
      } catch (phase2Error) {
        console.error("[SafeParse] Structural slice recovery failed:", phase2Error);
      }
    }

    throw new ApiError(
      'PARSE_ERROR',
      `${context}: AI returned unparseable content. Content may be too long.`,
      false
    );
  }
}

async function callGenAI(model: string, systemPrompt: string, userMessage: string, maxTokens: number, jsonMode: boolean = true, responseSchema: any = null) {
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        systemPrompt,
        userMessage,
        maxTokens,
        jsonMode,
        responseSchema
      })
    });

    const responseText = await response.text();

    // Check if the response contains HTML instead of JSON
    if (responseText.trim().startsWith('<') || responseText.trim().toLowerCase().startsWith('<!doctype')) {
      console.error("[ApiManager] Received HTML response from API endpoint instead of JSON. Full Response:", responseText.slice(0, 1000));
      throw new ApiError(
        'ROUTE_ERROR',
        `The server returned an HTML error page. This usually means the server is starting or was temporarily offline. Please try again.`,
        true
      );
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {}
      const message = errorData.error?.message || `HTTP ${response.status}`;
      const code = errorData.error?.status || 'API_ERROR';
      throw new ApiError(code, message, response.status >= 500);
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr: any) {
      throw new ApiError('PARSE_ERROR', `Failed to parse API response as JSON: ${parseErr.message}`, true);
    }

    return data.text;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('NETWORK_ERROR', error.message || 'Failed to connect to AI server', true);
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTION 7 — PYRA CHAT MANAGER
// ─────────────────────────────────────────────────────────────────

const chatSessions = new Map<string, any[]>();

export const PyraChatManager = {
  getHistory(sessionId: string) {
    return chatSessions.get(sessionId) || [];
  },

  addMessage(sessionId: string, role: string, content: string) {
    const history = this.getHistory(sessionId);
    history.push({ role: role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] });

    const MAX = CONFIG.PYRA_MAX_HISTORY;
    if (history.length > MAX) {
      const preserved = history.slice(0, 2);
      const recent = history.slice(-(MAX - 2));
      chatSessions.set(sessionId, [...preserved, ...recent]);
    } else {
      chatSessions.set(sessionId, history);
    }
  },

  clearSession(sessionId: string) {
    chatSessions.delete(sessionId);
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 8 — PUBLIC API MANAGER
// ─────────────────────────────────────────────────────────────────

const LATEX_MANDATE = `\n\nMANDATORY LATEX FORMATTING COMPLIANCE:
- You MUST format all mathematical expressions, equations, formulas, physical constants, chemical reactions, variables (like x, y), numeric fractions, and scientific notation using standard LaTeX syntax.
- Use single dollar signs ($) for inline equations (e.g. $E=mc^2$ or $f(x) = x^2$).
- Use double dollar signs ($$) for block or multi-line equations.
- Never write plain text math like "x^2" or "alpha + beta" or "H2O". They MUST be formatted in LaTeX (e.g., $x^2$, $\\alpha + \\beta$, $\\text{H}_2\\text{O}$). This is critical for clear user understanding in the app's LaTeX-compatible renderer.`;

export const ApiManager = {
  async generateContent({ type, content, mode = 'normal_study', requestedCount = null, level = 'gcse', subject = '', systemPrompt, responseSchema }: any) {
    const rate = RateLimiter.check();
    if (!rate.allowed) {
      throw new ApiError('RATE_LIMITED', `Hourly limit reached. Resets in ${rate.resetInMinutes} min.`, false);
    }

    const cacheInput = { content: content.slice(0, 500), type, mode, requestedCount, level };
    const cached = await CacheManager.get(type, cacheInput);
    if (cached) return cached;

    const dedupeKey = CacheManager.buildKey(type, cacheInput);
    return InFlight.getOrCreate(dedupeKey, async () => {
      let modelName = (type === 'audit' || content.length > 8000) ? CONFIG.MODELS.pro : CONFIG.MODELS.flash;
      const countInstruction = requestedCount ? `\n\nMANDATORY: Generate exactly ${requestedCount} items.` : '';
      const promptText = `Subject: ${subject}\nLevel: ${level}\nMode: ${mode}${countInstruction}\n\nContent:\n${content}`;

      RateLimiter.increment();
      
      let lastErr: any;
      let responseText: string | null = null;
      
      const maxTokens = (CONFIG.MAX_TOKENS as any)[type] || 4096;

      const systemPromptWithLatex = `${systemPrompt || ''}${LATEX_MANDATE}`;

      // Try primary model
      try {
        responseText = await callGenAI(modelName, systemPromptWithLatex, promptText, maxTokens, !!responseSchema, responseSchema);
      } catch (err: any) {
        lastErr = err;
        // Fallback to flash unconditionally if pro fails
        if (modelName !== CONFIG.MODELS.flash) {
          try {
            console.warn(`[ApiManager] Fallback to ${CONFIG.MODELS.flash} due to error:`, err);
            responseText = await callGenAI(CONFIG.MODELS.flash, systemPromptWithLatex, promptText, maxTokens, !!responseSchema, responseSchema);
          } catch (e) { lastErr = e; }
        }
      }

      if (!responseText) throw lastErr;
      
      let parsed = responseText;
      if (responseSchema || responseText.includes('{')) {
        parsed = safeParseJSON(responseText, type);
      }

      await CacheManager.set(type, cacheInput, parsed);
      return parsed;
    });
  },

  async pyraChat({ sessionId, userMessage, systemPrompt, forgeDocument, forgeData }: any) {
    const rate = RateLimiter.check();
    if (!rate.allowed) throw new ApiError('RATE_LIMITED', 'Hourly limit reached.', false);

    PyraChatManager.addMessage(sessionId, 'user', userMessage);
    const history = PyraChatManager.getHistory(sessionId);
    const fullSystemPrompt = `${systemPrompt}\n\nFORGE_DOCUMENT:\n${forgeDocument ? forgeDocument.slice(0, 3000) : 'No doc.'}\n\nFORGE_DATA:\n${JSON.stringify(forgeData || {}).slice(0, 1000)}${LATEX_MANDATE}`;

    RateLimiter.increment();
    
    let modelName = CONFIG.MODELS.pro;
    let responseText: string | null = null;
    let lastErr: any;

    // For chat we need to build a single prompt or use messages accurately. 
    // Since callGenAI is simple and uses systemPrompt + userMessage, 
    // let's adapt for history by appending to userMessage if needed, 
    // but better would be a multi-turn call.
    // However, following the "simple fetch" approach:
    
    const historyText = history.map(h => `${h.role === 'model' ? 'Assistant' : 'User'}: ${h.parts[0].text}`).join('\n');
    const finalUserMessage = `Conversation History:\n${historyText}\n\nUser: ${userMessage}`;

    try {
      responseText = await callGenAI(modelName, fullSystemPrompt, finalUserMessage, CONFIG.MAX_TOKENS.pyra, false);
    } catch (err) {
      lastErr = err;
      // Fallback
      try {
        responseText = await callGenAI(CONFIG.MODELS.flash, fullSystemPrompt, finalUserMessage, CONFIG.MAX_TOKENS.pyra, false);
      } catch (e) { lastErr = e; }
    }

    if (!responseText) throw lastErr;

    PyraChatManager.addMessage(sessionId, 'assistant', responseText);
    return responseText;
  },

  async invalidateAfterUpload() {
    await CacheManager.invalidateType('audit');
    await CacheManager.invalidateType('flashcards');
    await CacheManager.invalidateType('quiz');
    await CacheManager.invalidateType('forgecast');
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 10 — THINGS JAVASCRIPT SHOULD DO INSTEAD OF AI
// ─────────────────────────────────────────────────────────────────

export const NoAI = {
  calculateSM2(card: any, grade: number) {
    let { ease = 2.5, interval = 1, repetitions = 0 } = card;
    if (grade >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * ease);
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }
    ease = Math.max(1.3, ease + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);
    return { ease, interval, repetitions, nextReviewDate: nextReview };
  },

  calculateForgeScore({ retentionRate, examAverage, streakDays, matureCards, lifetimeEmbers }: any) {
    const retention = Math.min(100, Math.max(0, retentionRate));
    const exam = Math.min(100, Math.max(0, examAverage || 0));
    const consistency = Math.min(100, streakDays * 5);
    const mature = Math.min(100, (matureCards / 100) * 100);
    const embers = Math.min(100, (lifetimeEmbers / 1000) * 100);

    const score = retention * 0.30 + exam * 0.25 + consistency * 0.20 + mature * 0.15 + embers * 0.10;
    const rounded = Math.round(score * 10) / 10;

    const rankThresholds: [number, string][] = [
      [12.9,  'ember'],
      [25.9,  'kindler'],
      [40.9,  'forger'],
      [58.9,  'architect'],
      [74.9,  'smelter'],
      [88.9,  'sovereign'],
      [100,   'undying'],
    ];
    const rank = rankThresholds.find(([t]) => rounded <= t)?.[1] || 'undying';

    return { score: rounded, rank };
  },

  calculateEmberEarnings({ sessionType, accuracy, streakDays, examScore }: any) {
    let base = 0, bonuses: any[] = [];
    if (sessionType === 'srs_review') {
      base = 10;
      if (accuracy >= 90) bonuses.push({ reason: '90%+ accuracy', amount: 15 });
      if (accuracy === 100) bonuses.push({ reason: 'Perfect session', amount: 20 });
    }
    if (sessionType === 'exam_completed') {
      base = 15;
      if (examScore >= 90) bonuses.push({ reason: '90%+ exam score', amount: 35 });
    }
    const streakBonus = streakDays >= 7 ? 12 : streakDays >= 3 ? 5 : 0;
    if (streakBonus > 0) bonuses.push({ reason: `${streakDays}-day streak`, amount: streakBonus });

    const total = base + bonuses.reduce((sum, b) => sum + b.amount, 0);
    return { base, bonuses, total };
  }
};

export async function initApiManager() {
  await CacheManager.purgeExpired();
  console.log('[Study Forge] ApiManager initialised.');
}
