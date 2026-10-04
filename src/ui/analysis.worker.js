// Runs the analyzer off the main thread so big logs never freeze the page.
import { analyze } from '../analyzer/index.ts';

self.onmessage = (e) => {
  const { id, text } = e.data;
  try {
    const r = analyze(text);
    // The UI re-splits lines itself, and only shows the first frames, so don't copy big arrays back.
    self.postMessage({ id, result: r ? { ...r, lines: [], frames: r.frames.slice(0, 500) } : null });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
