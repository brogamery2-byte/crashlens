# CrashLens

**Turn scary errors into understandable answers.**

CrashLens is an open-source developer tool that takes error messages, stack traces and crash logs and explains what happened, why, and what to try. Analysis is deterministic (parsers and pattern matching) and runs entirely in your browser.

> Status: early version. The UI is a single static page (`index.html`); the analysis engine also exists as tested TypeScript modules in `src/`.

<!-- Screenshots: add images to /docs and link them here -->

## Features

- Paste, upload (text files up to 25 MB) or drag and drop a log
- Stack trace parsing for Java, Python and JavaScript
- Language and platform classification, including Minecraft detection
- Minecraft details: Minecraft/loader/Java versions, OS, mod list (Fabric crash report format), suspected mod
- 19 built-in error patterns with causes, fixes (difficulty, risk, copy-only commands) and official docs links where known
- Transparent confidence score with the evidence behind it
- Evidence view with "Show in original log", plus a searchable log viewer
- Local history (summaries by default; full logs only if you opt in), settings, light/dark theme

## Supported errors

Java (NoClassDefFoundError, ClassNotFoundException, NullPointerException, OutOfMemoryError, StackOverflowError, UnsupportedClassVersionError), Python (ModuleNotFoundError, KeyError, TypeError), JavaScript (TypeError, ReferenceError), Node.js module resolution, Git (push rejected, authentication), C/C++ (undefined reference, segfault), Minecraft (LWJGL, Mixin, dependency, Java version). Other exceptions get a generic explanation. See the in-app "Supported formats" page for limits.

## Run it

Open `index.html` in a browser, or serve the folder (`python3 -m http.server 8000`). Any static host works (GitHub Pages, Cloudflare Pages, Netlify) with no build command and the repository root as the publish directory.

## Development

```
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # compiles src/ to dist/
```

## Project structure

```
index.html            standalone UI (contains an inlined copy of the engine)
src/analyzer/         the engine as TypeScript modules
  stacktrace.ts       exception-line regex and Java/Python/JS frame parser
  classifier.ts       language detection
  environment.ts      Minecraft/loader/Java/OS detection, suspected mod
  patterns.ts         pattern database
  confidence.ts       evidence-weighted score
  analyze.ts          the pipeline
  normalize.ts        large-log reduction
  index.ts            public API and RuleBasedAnalyzer (AnalysisProvider)
src/samples.ts        example inputs
tests/                Vitest tests
```

**Known duplication:** `index.html` still carries its own copy of the engine. The TypeScript modules are the tested source of truth; wiring the page to import them (for example with Vite) is the next step, and until then changes must be made in both places.

## Privacy

Logs are processed locally. Nothing is uploaded. Uploaded files are read as text and never executed, and log content is rendered as plain text. Commands in suggested fixes are only displayed for you to copy. There is no external AI provider in this version.

## Confidence

A fixed-weight sum of evidence: exception found +25, specific pattern +25, known environment +15, stack frame +15, dependency relationship +10, two or more matching lines +10.

## Roadmap

- [x] Basic log analysis
- [x] Stack trace parsing (Java, Python, JavaScript)
- [x] Error classification
- [x] Minecraft detection
- [x] Local history
- [x] Responsive UI
- [x] Analyzer split into TypeScript modules with Vitest tests and CI (typecheck, test, build)
- [ ] Wire the UI to the TypeScript modules (Vite + React) and add ESLint/Prettier
- [ ] More patterns (merge conflicts, ESM/CommonJS, compiler errors)
- [ ] Web Worker parsing for very large logs
- [ ] AI-assisted analysis (opt-in, off by default)
- [ ] CLI, GitHub Action, VS Code extension

## Contributing

Issues and pull requests are welcome. New patterns are the easiest contribution: add an entry to `src/analyzer/patterns.ts` (and, until the UI imports the modules, the `P` array in `index.html`).

## License

MIT, see [LICENSE](LICENSE).
