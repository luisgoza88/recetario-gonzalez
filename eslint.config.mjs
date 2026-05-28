import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested git worktrees traen su propio .next/ y copia de src/ que el
    // glob ".next/**" no cubre, inflando el lint con miles de falsos positivos.
    ".claude/**",
    // Artefactos generados que no deben lintearse.
    "coverage/**",
    "public/sw.js",
    "public/sw.js.map",
  ]),
  {
    rules: {
      // Disable overly strict React 19 rules that flag common patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      // Allow unescaped entities in JSX (quotes, apostrophes)
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
