import { describe, expect, it } from 'vitest';
import { RuleBasedAnalyzer, SAMPLES, analyze, parseFrames, reduceLog, score } from '../src/analyzer/index.js';

describe('classification', () => {
  it('Java NoClassDefFoundError', () => {
    const r = analyze('java.lang.NoClassDefFoundError: org/lwjgl/sdl/SDL');
    expect(r?.language).toBe('Java');
    expect(r?.errorType).toBe('NoClassDefFoundError');
    expect(r?.pattern).toBe('java-ncdfe');
  });
  it('Python ModuleNotFoundError', () => {
    const r = analyze("ModuleNotFoundError: No module named 'requests'");
    expect(r?.language).toBe('Python');
    expect(r?.errorType).toBe('ModuleNotFoundError');
    expect(r?.fixes[0]?.c).toBe('python -m pip install requests');
  });
  it('JavaScript TypeError', () => {
    const r = analyze('TypeError: Cannot read properties of undefined');
    expect(r?.language).toBe('JavaScript');
    expect(r?.errorType).toBe('TypeError');
  });
  it('Minecraft detection', () => {
    const r = analyze('Minecraft 1.21.1\nFabric Loader 0.16.5\norg.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: boom\n');
    expect(r?.platform).toBe('Minecraft');
    expect(r?.env.loader).toBe('Fabric');
    expect(r?.env.mcVer).toBe('1.21.1');
    expect(r?.pattern).toBe('mc-mixin');
  });
  it('returns null when nothing is recognizable', () => {
    expect(analyze('all good, nothing to see here')).toBeNull();
  });
});

describe('stack frames', () => {
  it('parses Java, Python and JavaScript frames', () => {
    const [j] = parseFrames(['\tat com.example.Foo.bar(Foo.java:42)']);
    expect(j?.className).toBe('com.example.Foo');
    expect(j?.function).toBe('bar');
    expect(j?.file).toBe('Foo.java');
    expect(j?.line).toBe(42);
    const [p] = parseFrames(['  File "app.py", line 3, in <module>']);
    expect(p?.file).toBe('app.py');
    expect(p?.line).toBe(3);
    expect(p?.function).toBe('<module>');
    const [s] = parseFrames(['    at renderList (/app/src/list.js:42:17)']);
    expect(s?.function).toBe('renderList');
    expect(s?.file).toBe('/app/src/list.js');
    expect(s?.line).toBe(42);
    expect(s?.column).toBe(17);
  });
});

describe('confidence', () => {
  const none = { exc: false, pat: false, env: false, frames: false, dep: false, corr: false };
  it('is a deterministic sum of evidence weights', () => {
    expect(score(none).score).toBe(0);
    expect(score({ ...none, exc: true, pat: true }).score).toBe(50);
    expect(score({ exc: true, pat: true, env: true, frames: true, dep: true, corr: true }).score).toBe(100);
  });
  it('gives identical results for identical input', () => {
    const t = SAMPLES['Python: ModuleNotFoundError'] ?? '';
    expect(analyze(t)?.conf).toEqual(analyze(t)?.conf);
  });
});

describe('samples and large logs', () => {
  it('analyzes every bundled sample', () => {
    for (const [name, text] of Object.entries(SAMPLES)) {
      expect(analyze(text) === null ? name : 'ok').toBe('ok');
    }
  });
  it('maps Minecraft samples to the expected patterns', () => {
    expect(analyze(SAMPLES['Minecraft: Fabric dependency error'] ?? '')?.pattern).toBe('mc-deps');
    expect(analyze(SAMPLES['Minecraft: Mixin error'] ?? '')?.pattern).toBe('mc-mixin');
    expect(analyze(SAMPLES['Minecraft: Java version mismatch'] ?? '')?.pattern).toBe('java-ver');
    expect(analyze(SAMPLES['Java: NoClassDefFoundError (LWJGL)'] ?? '')?.pattern).toBe('mc-lwjgl');
  });
  it('reduces huge logs to relevant lines', () => {
    const big = Array.from({ length: 20000 }, (_, i) => `[INFO] line ${i}`);
    big[10000] = 'java.lang.OutOfMemoryError: Java heap space';
    const [out, note] = reduceLog(big.join('\n'));
    expect(out.length).toBeLessThan(big.join('\n').length / 10);
    expect(out).toContain('OutOfMemoryError');
    expect(note === null).toBe(false);
  });
  it('RuleBasedAnalyzer implements the provider interface', async () => {
    const r = await new RuleBasedAnalyzer().analyze({ text: SAMPLES['Java: NullPointerException'] ?? '' });
    expect(r?.errorType).toBe('NullPointerException');
  });
});
