export type RedactionCounts = Record<string, number>;
export interface Redacted { text: string; counts: RedactionCounts }

type Rule = [label: string, re: RegExp, fn: (match: string, groups: string[]) => string | null];

/**
 * Best-effort masking of private details before anything leaves the browser.
 * It cannot catch everything, which is why the UI always shows the exact text for review before sending.
 */
const RULES: Rule[] = [
  ['secrets', /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g, () => '<secret>'],
  ['secrets', /\b(?:sk-[\w-]{16,}|AIza[\w-]{20,}|gh[pousr]_\w{20,}|xox[baprs]-[\w-]{10,}|AKIA[0-9A-Z]{16})/g, () => '<secret>'],
  ['secrets', /\bBearer\s+[\w.~+/=-]{16,}/gi, () => 'Bearer <secret>'],
  ['secrets', /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization)(\s*[:=]\s*)(?!<secret>)[^\s,;'"]+/gi, (_m, g) => `${g[0]}${g[1]}<secret>`],
  ['emails', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, () => '<email>'],
  ['user folders', /([A-Za-z]:[\\/]+Users[\\/]+)([^\\/\s'"]+)/gi, (_m, g) => `${g[0]}<user>`],
  ['user folders', /(\/(?:Users|home)\/)([^/\s'"]+)/g, (_m, g) => `${g[0]}<user>`],
  ['IP addresses', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (m) => (m.split('.').every((o) => Number(o) <= 255) ? '<ip>' : null)],
  ['long hex ids', /\b[a-f0-9]{32,}\b/gi, () => '<hex-id>'],
];

export function redact(input: string): Redacted {
  const counts: RedactionCounts = {};
  let text = input;
  for (const [label, re, fn] of RULES) {
    text = text.replace(re, (...args: unknown[]) => {
      const match = args[0] as string;
      const groups = args.slice(1).filter((a): a is string => typeof a === 'string');
      const out = fn(match, groups);
      if (out === null) return match;
      counts[label] = (counts[label] ?? 0) + 1;
      return out;
    });
  }
  return { text, counts };
}

export function describeRedactions(counts: RedactionCounts): string {
  const parts = Object.entries(counts).map(([k, n]) => `${n} ${k}`);
  return parts.length ? `Hidden before sending: ${parts.join(', ')}.` : 'Nothing matched the privacy filters.';
}
