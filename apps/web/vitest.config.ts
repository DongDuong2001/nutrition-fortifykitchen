import { defineConfig } from "vitest/config";

export default defineConfig({
  // The unit tests of the sample history and sample weights expect demo data. demo.test.ts switches it off itself.
  test: { setupFiles: ["./lib/__tests__/setup-demo.ts"] },
});
