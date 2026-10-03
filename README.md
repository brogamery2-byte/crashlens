# CrashLens

**Turn scary errors into understandable answers.**

CrashLens is an open-source developer tool that takes error messages, stack traces and crash logs and explains what happened, why, and what to try. Analysis is deterministic (parsers and pattern matching) and runs entirely in your browser.

> Status: early version. It is a single static page (`index.html`) with no build step.

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

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Any static host works (GitHub Pages, Cloudflare Pages, Netlify). No build command; publish directory is the repository root.

## Privacy

Logs are processed locally. Nothing is uploaded. Uploaded files are read as text and never executed, and log content is rendered as plain text. Commands in suggested fixes are only displayed for you to copy. There is no external AI provider in this version.

## Architecture

All code lives in `index.html`. The analysis pipeline is: normalize, extract exceptions, parse stack frames, classify, detect environment, match patterns, collect evidence, score confidence. Confidence is a fixed-weight sum (exception +25, specific pattern +25, known environment +15, stack frame +15, dependency relationship +10, 2+ corroborating lines +10).

## Roadmap

- [x] Basic log analysis
- [x] Stack trace parsing (Java, Python, JavaScript)
- [x] Error classification
- [x] Minecraft detection
- [x] Local history
- [x] Responsive UI
- [ ] Split into TypeScript modules (analyzer reusable from a CLI)
- [ ] Unit tests and CI
- [ ] More patterns (merge conflicts, ESM/CommonJS, compiler errors)
- [ ] Web Worker parsing for very large logs
- [ ] AI-assisted analysis (opt-in, off by default)
- [ ] CLI, GitHub Action, VS Code extension

## Contributing

Issues and pull requests are welcome. New patterns are the easiest contribution: add an entry to the `P` array in `index.html`.

## License

MIT, see [LICENSE](LICENSE).
