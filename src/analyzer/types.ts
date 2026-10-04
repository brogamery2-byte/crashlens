export type Language = 'Java' | 'Python' | 'JavaScript' | 'C/C++' | 'Git' | 'Unknown';
export interface StackFrame { language: string; file?: string; line?: number; column?: number; function?: string; className?: string; n: number }
export interface ExcLine { n: number; name: string; msg: string; caused: boolean }
export interface Mod { id: string; version: string }
export interface Env { mc: boolean; loader: string | null; mods: Mod[]; node: boolean; mcVer: string | null; loaderVer: string | null; java: string | null; os: string | null; arch: string | null; mixins: number }
export interface Suspect { id: string; via: string; version?: string }
export interface Fix { t: string; d: string; r: string; w: string; c?: string }
export interface ErrorPattern { id: string; n: string; lang: string; app?: string; re: RegExp; need?: RegExp; dep?: number; s: string; y: string; f: Fix[]; a: string[]; u?: string }
export type Explanation = Pick<ErrorPattern, 'id' | 'n' | 's' | 'y' | 'f' | 'a' | 'u'>;
export interface ConfidenceItem { label: string; points: number; ok: boolean }
export interface Confidence { score: number; items: ConfidenceItem[] }
export interface ScoreInput { exc: unknown; pat: unknown; env: unknown; frames: unknown; dep: unknown; corr: unknown }
export interface Evidence { n: number; t: string }
export interface AnalysisResult {
  version: 1; title: string; language: Language; platform: string; errorType: string; severity: 'error';
  summary: string; why: string; pattern: string; evidence: Evidence[]; fixes: Fix[]; avoid: string[]; doc?: string;
  conf: Confidence; env: Env; frames: StackFrame[]; frameCount: number; sus: Suspect | null; exc?: ExcLine; root?: ExcLine; lines: string[];
}
export interface AnalysisInput { text: string }
/** Every analysis backend (rule-based now, AI later) implements this; the UI never needs to know which one ran. */
export interface AnalysisProvider { readonly id: string; analyze(input: AnalysisInput): Promise<AnalysisResult | null> }
