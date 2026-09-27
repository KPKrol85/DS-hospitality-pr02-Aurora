import { afterEach, vi } from "vitest";

// Every test mounts its own fixture and URL. Mocked globals and spies are restored by
// vitest.config.mjs (unstubGlobals, restoreMocks).
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  window.history.replaceState(null, "", "/");
});
