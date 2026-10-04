# CrashLens

**Turn scary errors into understandable answers.**

[![CI](https://github.com/brogamery2-byte/crashlens/actions/workflows/ci.yml/badge.svg)](https://github.com/brogamery2-byte/crashlens/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/brogamery2-byte/crashlens)](https://github.com/brogamery2-byte/crashlens/releases)
[![License: MIT](https://img.shields.io/github/license/brogamery2-byte/crashlens)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/brogamery2-byte/crashlens)](https://github.com/brogamery2-byte/crashlens/commits/main)
[![Live production](https://img.shields.io/badge/production-crashlens.pages.dev-blue)](https://crashlens.pages.dev)
[![Live preview](https://img.shields.io/badge/preview-beta.crashlens.pages.dev-orange)](https://beta.crashlens.pages.dev)
[![Runs locally](https://img.shields.io/badge/privacy-runs%20locally-brightgreen)](#privacy)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

CrashLens is an open-source developer tool that takes error messages, stack traces and crash logs and explains what happened, why, and what to try. Analysis is deterministic (parsers and pattern matching) and runs entirely in your browser.

> Status: early version. The UI is a single static page (`index.html`); the analysis engine also exists as tested TypeScript modules in `src/`.

<!-- Screenshots: add images to /docs and link them here -->

## Try it

**[crashlens.pages.dev](https://crashlens.pages.dev)**: paste an error or log, or pick one of the built-in examples. Everything runs in your browser; nothing is uploaded.

## Features

- Paste, upload (text files up to 25 MB) or drag and drop a log
- Stack trace parsing for Java, Python and JavaScript
- Language and platform classification, including Minecraft detection
- Minecraft details: Minecraft/loader/Java versions, OS, mod list (Fabric crash report format), suspected mod
- 44 built-in error patterns with causes, fixes (difficulty, risk, copy-only commands) and official docs links where known
- Transparent confidence score with the evidence behind it
- Evidence view with "Show in original log", plus a searchable log viewer
- Local history (summaries by default; full logs only if you opt in), settings, light/dark theme

## Supported errors

Java (NoClassDefFoundError, ClassNotFoundException, NullPointerException, OutOfMemoryError, StackOverflowError, UnsupportedClassVersionError, IllegalArgument/IllegalState/UnsupportedOperation/ClassCast/ArrayIndexOutOfBounds), Python (ModuleNotFoundError, ImportError, KeyError, IndexError, AttributeError, FileNotFoundError, ValueError, TypeError), JavaScript/Node.js (TypeError, ReferenceError, SyntaxError, invalid JSON, call stack overflow, unhandled rejections, module resolution, ESM/CommonJS conflicts, npm ERESOLVE and EACCES), TypeScript compiler errors, Git (push rejected, authentication, merge conflicts, detached HEAD), C/C++ (undefined reference, missing headers, undeclared identifiers, segfault), Minecraft (LWJGL, Mixin, dependencies, Java version, Forge/NeoForge loading, OpenGL/GLFW, Paper/Spigot plugins). Other exceptions get a generic explanation. See the in-app "Supported formats" page for limits.

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

