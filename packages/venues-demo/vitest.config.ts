import { defineConfig } from "vitest/config";

// The venues-demo suite is integration-style: it spawns node subprocesses
// (validate-dataset, gen-venues, gen-examples, check-version, package-manager
// guard) and loads the 2,113-venue dataset plus nine venue documents. On a
// loaded shared machine a subprocess can take ~10s just to start (2026-11-21:
// validator ran 9.7s under load average ~250), so the default 5s timeout
// flakes the gate. 30s keeps genuinely hung tests failing while absorbing
// queueing; CI runners are unaffected either way.
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
