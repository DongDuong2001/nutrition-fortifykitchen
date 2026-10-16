import { defineConfig } from "vitest/config";
import path from "path";

// The app's day is Asia/Ho_Chi_Minh, and some tests build dates in local time. Pin the zone before the workers
// start so a run in UTC (a CI machine) gives the same result as one on a laptop in Việt Nam.
process.env.TZ = "Asia/Ho_Chi_Minh";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // The unit tests of the sample history and sample weights expect demo data. demo.test.ts switches it off itself.
  test: { setupFiles: ["./lib/__tests__/setup-demo.ts"] },
});
