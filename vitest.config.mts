import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      thresholds: { lines: 96, functions: 90, branches: 91 },
      include: ["src/lib/**"],
      exclude: [
        "src/**/*.test.ts",
        "src/lib/repo/firestore.ts",
        "src/lib/server.ts",
        "src/lib/ai/gemini.ts",
        "src/lib/notify/email.ts",
      ],
    },
  },
});
