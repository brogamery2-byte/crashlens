import { describe, expect, it } from 'vitest';
import { RuleBasedAnalyzer, SAMPLES, analyze, normalizeLog, parseFrames, reduceLog, score } from '../src/analyzer/index.js';

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

const CASES: [string, string, string][] = [
 [
  "git merge conflict",
  "Auto-merging app.js\nCONFLICT (content): Merge conflict in app.js\nAutomatic merge failed; fix conflicts and then commit the result.\n",
  "git-conflict"
 ],
 [
  "git detached HEAD",
  "Note: switching to 'abc123'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental changes.\n",
  "git-detached"
 ],
 [
  "node ERR_REQUIRE_ESM",
  "Error [ERR_REQUIRE_ESM]: require() of ES Module /app/node_modules/chalk/source/index.js from /app/index.js not supported.\n",
  "node-esm"
 ],
 [
  "node import outside module",
  "SyntaxError: Cannot use import statement outside a module\n    at wrapSafe (node:internal/modules/cjs/loader:1281:20)\n",
  "node-esm"
 ],
 [
  "npm ERESOLVE",
  "npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE unable to resolve dependency tree\nnpm ERR! Found: react@19.0.0\n",
  "npm-eresolve"
 ],
 [
  "npm EACCES",
  "npm ERR! code EACCES\nnpm ERR! syscall mkdir\nnpm ERR! path /usr/lib/node_modules\nnpm ERR! errno -13\n",
  "node-eacces"
 ],
 [
  "TypeScript TS2304",
  "src/app.ts(12,5): error TS2304: Cannot find name 'foo'.\n",
  "ts-error"
 ],
 [
  "C missing header",
  "main.c:1:10: fatal error: foo.h: No such file or directory\n    1 | #include <foo.h>\ncompilation terminated.\n",
  "c-header"
 ],
 [
  "C undeclared",
  "main.c: In function 'main':\nmain.c:5:3: error: 'x' undeclared (first use in this function)\n",
  "c-compile"
 ],
 [
  "Forge mod loading",
  "net.minecraftforge.fml.ModLoadingException: Mod examplemod requires forge 52.0.0 or above\n\tat net.minecraftforge.fml.ModLoader.gatherAndInitializeMods(ModLoader.java:100)\nMinecraft 1.21.1\n",
  "mc-forge"
 ],
 [
  "OpenGL / GLFW",
  "[Render thread/ERROR]: GLFW error 65542: WGL: The driver does not appear to support OpenGL\nMinecraft 1.21.1\n",
  "mc-opengl"
 ],
 [
  "Paper plugin",
  "[Server thread/ERROR]: Could not load 'plugins/Foo.jar' in folder 'plugins'\norg.bukkit.plugin.UnknownDependencyException: Bar\n\tat org.bukkit.plugin.SimplePluginManager.loadPlugin(SimplePluginManager.java:300)\n",
  "mc-plugin"
 ],
 [
  "Python AttributeError",
  "Traceback (most recent call last):\n  File \"a.py\", line 2, in <module>\n    x.foo()\nAttributeError: 'NoneType' object has no attribute 'foo'\n",
  "py-attr"
 ],
 [
  "Python ImportError",
  "Traceback (most recent call last):\n  File \"a.py\", line 1, in <module>\nImportError: cannot import name 'Foo' from 'bar' (/x/bar.py)\n",
  "py-import"
 ],
 [
  "Python FileNotFoundError",
  "Traceback (most recent call last):\n  File \"a.py\", line 4, in <module>\nFileNotFoundError: [Errno 2] No such file or directory: 'config.yml'\n",
  "py-fnf"
 ],
 [
  "Python IndexError",
  "Traceback (most recent call last):\n  File \"a.py\", line 4, in <module>\nIndexError: list index out of range\n",
  "py-index"
 ],
 [
  "Python ValueError",
  "Traceback (most recent call last):\n  File \"a.py\", line 4, in <module>\nValueError: invalid literal for int() with base 10: 'abc'\n",
  "py-value"
 ],
 [
  "JSON parse",
  "SyntaxError: Unexpected token < in JSON at position 0\n    at JSON.parse (<anonymous>)\n",
  "js-json"
 ],
 [
  "call stack",
  "RangeError: Maximum call stack size exceeded\n    at f (/app/a.js:2:3)\n",
  "js-stack"
 ],
 [
  "promise rejection",
  "[UnhandledPromiseRejection: This error originated either by throwing inside of an async function without a catch block]\n",
  "js-promise"
 ],
 [
  "JS SyntaxError",
  "SyntaxError: Unexpected identifier 'foo'\n    at wrapSafe (node:internal/modules/cjs/loader:1281:20)\n",
  "js-syntax"
 ],
 [
  "Java IllegalArgument",
  "Exception in thread \"main\" java.lang.IllegalArgumentException: bad\n\tat com.a.B.c(B.java:1)\n",
  "java-iae"
 ],
 [
  "Java IllegalState",
  "java.lang.IllegalStateException: closed\n\tat com.a.B.c(B.java:1)\n",
  "java-ise"
 ],
 [
  "Java UnsupportedOperation",
  "java.lang.UnsupportedOperationException\n\tat java.base/java.util.ImmutableCollections.uoe(ImmutableCollections.java:142)\n",
  "java-uoe"
 ],
 [
  "Java ArrayIndexOutOfBounds",
  "java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 3\n\tat com.a.B.c(B.java:1)\n",
  "java-aioobe"
 ],
 [
  "Java ClassCast",
  "java.lang.ClassCastException: class A cannot be cast to class B\n\tat com.a.B.c(B.java:1)\n",
  "java-cce"
 ]
];

describe('pattern coverage', () => {
  for (const [name, text, id] of CASES) {
    it(name, () => {
      expect(analyze(text)?.pattern).toBe(id);
    });
  }
});

describe('full-log scanning', () => {
  it('normalizes line endings and ANSI colours without changing line count', () => {
    expect(normalizeLog('a\r\nb\rc\u001b[31md\u001b[0m')).toBe('a\nb\ncd');
  });
  it('finds an error buried deep in a huge log, with the true line number', () => {
    const lines = Array.from({ length: 200000 }, (_, i) => `[INFO] line ${i}`);
    lines[150000] = 'java.lang.OutOfMemoryError: Java heap space';
    const r = analyze(lines.join('\n'));
    expect(r?.pattern).toBe('java-oom');
    expect(r?.evidence.map((e) => e.n)).toContain(150001);
  });
  it('reports the full frame count', () => {
    const r = analyze('java.lang.NullPointerException\n\tat a.B.c(B.java:1)\n\tat a.B.d(B.java:2)\n');
    expect(r?.frameCount).toBe(2);
  });
});
