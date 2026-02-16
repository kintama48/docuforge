import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", "e2e/**", "playwright.config.ts"],
    // Limit parallelism to prevent memory exhaustion
    maxWorkers: 2,
    minWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // CRITICAL: Set to false to only analyze files actually imported by tests
      all: false,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**",
        "src/**/*.d.ts",
        "src/app/**",
        "src/pages/**",
        "src/lib/api-types.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
});
