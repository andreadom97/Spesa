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
    // I worktree di Claude Code stanno dentro il repo: sono copie intere del progetto, con il
    // loro .next/ compilato, e senza questa riga il lint del checkout principale li scansiona
    // come codice (8261 problemi misurati il 23/09, tutti in un worktree, zero in src/).
    ".claude/**",
  ]),
]);

export default eslintConfig;
