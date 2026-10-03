import { analyze } from './analyze.js';
import type { AnalysisInput, AnalysisProvider, AnalysisResult } from './types.js';

export { analyze } from './analyze.js';
export { score } from './confidence.js';
export { reduceLog } from './normalize.js';
export { parseFrames } from './stacktrace.js';
export { SAMPLES } from '../samples.js';
export type * from './types.js';

/** Default provider: local rules only. A future AIAnalyzer would implement the same interface. */
export class RuleBasedAnalyzer implements AnalysisProvider {
  readonly id = 'rule-based';
  async analyze(input: AnalysisInput): Promise<AnalysisResult | null> {
    return analyze(input.text);
  }
}
