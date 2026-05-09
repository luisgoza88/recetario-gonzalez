import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["src/lib/__tests__/**", "src/app/api/__tests__/**"],
      thresholds: {
        lines: 10, // Actual: 10.55% - mantener threshold que pasa
        functions: 8, // Actual: 8.59% - mantener threshold que pasa
        branches: 9, // Actual: 9.19% - mantener threshold que pasa
        statements: 10, // Actual: 10.34% - mantener threshold que pasa
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
