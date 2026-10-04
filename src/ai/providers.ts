/**
 * Bring-your-own-key AI providers. Requests go straight from the browser to the provider the user chose;
 * CrashLens has no server in between. Each provider is a small pure adapter (buildRequest + parseResponse),
 * so it can be unit tested without network access.
 */
export type ProviderId = 'anthropic' | 'gemini' | 'openai-compatible';
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  'openai-compatible': 'OpenAI-compatible',
};

export interface AiConfig { provider: ProviderId; model: string; apiKey: string; baseUrl?: string }
export interface AiRequest { system: string; user: string }
export interface HttpRequest { url: string; init: { method: 'POST'; headers: Record<string, string>; body: string; credentials: 'omit'; referrerPolicy: 'no-referrer'; cache: 'no-store' } }
export type FetchLike = (url: string, init: HttpRequest['init']) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const HTTPS_URL = /^https:\/\/[^\s/@?#]+(?:\/[^\s?#]*)?$/;
const LOCAL_URL = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/[^\s?#]*)?$/;

/** Returns a user-facing problem description, or null when the configuration is usable. */
export function validateConfig(cfg: AiConfig): string | null {
  if (!cfg.model.trim()) return 'Enter a model name (copy it from your provider\'s documentation).';
  if (cfg.provider === 'gemini' && !/^(?:models\/)?[\w.-]+$/.test(cfg.model.trim())) return 'The model name contains characters that are not allowed.';
  if (cfg.provider === 'openai-compatible') {
    const base = (cfg.baseUrl ?? '').trim();
    if (!base) return 'Enter the provider base URL, for example https://api.openai.com/v1.';
    if (!HTTPS_URL.test(base) && !LOCAL_URL.test(base)) return 'The base URL must start with https:// (plain http is only allowed for localhost).';
    if (!cfg.apiKey.trim() && !LOCAL_URL.test(base)) return 'Enter your API key.';
    return null;
  }
  return cfg.apiKey.trim() ? null : 'Enter your API key.';
}

export function buildRequest(cfg: AiConfig, req: AiRequest): HttpRequest {
  const common = { method: 'POST' as const, credentials: 'omit' as const, referrerPolicy: 'no-referrer' as const, cache: 'no-store' as const };
  const json = { 'content-type': 'application/json' };
  const model = cfg.model.trim();
  if (cfg.provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        ...common,
        headers: { ...json, 'x-api-key': cfg.apiKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: 1024, system: req.system, messages: [{ role: 'user', content: req.user }] }),
      },
    };
  }
  if (cfg.provider === 'gemini') {
    const id = model.replace(/^models\//, '');
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`,
      init: {
        ...common,
        headers: { ...json, 'x-goog-api-key': cfg.apiKey.trim() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: req.user }] }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    };
  }
  const headers: Record<string, string> = { ...json };
  if (cfg.apiKey.trim()) headers.authorization = `Bearer ${cfg.apiKey.trim()}`;
  return {
    url: `${(cfg.baseUrl ?? '').trim().replace(/\/+$/, '')}/chat/completions`,
    init: { ...common, headers, body: JSON.stringify({ model, messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }] }) },
  };
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function parseResponse(provider: ProviderId, json: unknown): string {
  if (!isRec(json)) return '';
  if (provider === 'anthropic') {
    return arr(json.content).map((b) => (isRec(b) && b.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('').trim();
  }
  if (provider === 'gemini') {
    const first = arr(json.candidates)[0];
    const parts = isRec(first) && isRec(first.content) ? arr(first.content.parts) : [];
    return parts.map((p) => (isRec(p) && typeof p.text === 'string' ? p.text : '')).join('').trim();
  }
  const first = arr(json.choices)[0];
  const content = isRec(first) && isRec(first.message) ? first.message.content : '';
  return typeof content === 'string' ? content.trim() : '';
}

function errorDetail(raw: string): string {
  try {
    const j: unknown = JSON.parse(raw);
    if (isRec(j)) {
      const e = j.error;
      if (typeof e === 'string') return e;
      if (isRec(e) && typeof e.message === 'string') return e.message;
    }
  } catch { /* not JSON */ }
  return raw;
}

export async function askAi(cfg: AiConfig, req: AiRequest, fetchImpl: FetchLike): Promise<string> {
  const problem = validateConfig(cfg);
  if (problem) throw new Error(problem);
  const { url, init } = buildRequest(cfg, req);
  const scrub = (s: string): string => (cfg.apiKey.trim().length >= 8 ? s.split(cfg.apiKey.trim()).join('<key>') : s);
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url, init);
  } catch {
    throw new Error('Could not reach the provider. Check your connection and URL; some providers also block direct requests from a browser (CORS).');
  }
  const raw = await res.text();
  if (!res.ok) throw new Error(scrub(`The provider returned HTTP ${res.status}: ${errorDetail(raw).slice(0, 300)}`));
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('The provider returned something that is not JSON. Check the base URL.'); }
  const text = parseResponse(cfg.provider, parsed);
  if (!text) throw new Error('The provider returned an empty answer (it may have been blocked by a safety filter).');
  return text;
}
