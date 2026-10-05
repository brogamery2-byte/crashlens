# CrashLens

**Turn scary errors into understandable answers.**

[![CI](https://github.com/brogamery2-byte/crashlens/actions/workflows/ci.yml/badge.svg)](https://github.com/brogamery2-byte/crashlens/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/brogamery2-byte/crashlens)](https://github.com/brogamery2-byte/crashlens/releases)
[![License: MIT](https://img.shields.io/github/license/brogamery2-byte/crashlens)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/brogamery2-byte/crashlens)](https://github.com/brogamery2-byte/crashlens/commits/main)
[![Live stable](https://img.shields.io/badge/stable-crashlens.pages.dev-blue)](https://crashlens.pages.dev)
[![Live beta](https://img.shields.io/badge/beta-beta.crashlens.pages.dev-orange)](https://beta.crashlens.pages.dev)
[![Runs locally](https://img.shields.io/badge/privacy-runs%20locally-brightgreen)](#privacy)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

CrashLens is an open-source developer tool that takes error messages, stack traces and crash logs and explains what happened, why, and what to try. Analysis is deterministic (parsers and pattern matching) and runs entirely in your browser.

> Status: early version. The UI is a single static page (`index.html`); the analysis engine also exists as tested TypeScript modules in `src/`.

<!-- Screenshots: add images to /docs and link them here -->

## Try it

**[crashlens.pages.dev](https://crashlens.pages.dev)**: paste an error or log, or pick one of the built-in examples. Everything runs in your browser; nothing is uploaded.

## Features

- Paste, upload (text files up to 25 MB) or drag and drop a log. The whole file is scanned in a background Web Worker, and a virtualized viewer keeps huge logs smooth
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

```
npm install
npm run dev       # local dev server
npm run build     # production build into dist/
npm run preview   # serve the production build
```

The UI uses ES modules, so opening `index.html` directly from disk no longer works; use the dev server or a build.

**Hosting (Cloudflare Pages, Netlify, GitHub Pages):** build command `npm run build`, output directory `dist`. If the host's default Node version is old, set `NODE_VERSION=22`.

## Development

```
npm run typecheck   # tsc --noEmit
npm test            # vitest
```

## Project structure

```
index.html            page skeleton
vite.config.js        Vite config
src/ui/main.js        UI (plain JavaScript; renders results from the analyzer)
src/ui/analysis.worker.js  runs the analyzer in a Web Worker
src/ui/style.css      styles
src/analyzer/         the engine as TypeScript modules (the only copy)
  stacktrace.ts       exception-line regex and Java/Python/JS frame parser
  classifier.ts       language detection
  environment.ts      Minecraft/loader/Java/OS detection, suspected mod
  patterns.ts         pattern database
  confidence.ts       evidence-weighted score
  analyze.ts          the pipeline
  normalize.ts        line normalization and log reduction
  index.ts            public API and RuleBasedAnalyzer (AnalysisProvider)
src/ai/                optional bring-your-own-key AI second opinion
  redact.ts           masks emails, user folders, IPs, key-shaped strings
  prompt.ts           builds the excerpt that would be sent (never the full log)
  providers.ts        Anthropic, Google Gemini and OpenAI-compatible adapters
src/samples.ts        example inputs
tests/                Vitest tests for the engine
```

The UI and tests share the same engine code. The UI layer itself has no automated tests yet.

## Privacy

Logs are processed locally. Nothing is uploaded. Uploaded files are read as text and never executed, and log content is rendered as plain text. Commands in suggested fixes are only displayed for you to copy.

**Optional AI second opinion (off by default).** In Settings you can turn on an "Ask AI" button and connect your own key for Anthropic, Google Gemini, or any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, local Ollama). Nothing is sent until you press Send on a preview that shows the exact text:

- Only a short summary, a few evidence lines and the top stack frames are included. The full log is never sent.
- Emails, user folder names, IP addresses and key-shaped strings are masked first. This is best effort, which is why you review the preview.
- Requests go directly from your browser to the provider. CrashLens has no server and never sees your key.
- The key stays in memory and disappears when you close the tab, unless you tick "Remember the key on this device" (stored unencrypted in the browser).
- The answer is shown as plain text, labeled as AI-generated, and nothing in it is ever executed.
- Some providers may block direct browser requests (CORS). Use "Test connection" in Settings to check.

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
- [x] UI wired to the TypeScript modules (Vite)
- [ ] Convert the UI script to TypeScript, add UI tests, ESLint and Prettier
- [ ] More patterns (merge conflicts, ESM/CommonJS, compiler errors)
- [x] Web Worker parsing and a virtualized viewer for very large logs
- [x] Optional AI second opinion with your own API key (off by default)
- [ ] CLI, GitHub Action, VS Code extension

## Contributing

Issues and pull requests are welcome. New patterns are the easiest contribution: add an entry to `src/analyzer/patterns.ts` and a test case in `tests/analyzer.test.ts`.

## License

MIT, see [LICENSE](LICENSE).
