#!/usr/bin/env node
/**
 * Squawk sobre las migraciones NUEVAS respecto a origin/master — nunca las 837
 * existentes (ya aplicadas; no se tocan). Atrapa antipatrones que bloquean la
 * tabla o rompen en producción: ADD COLUMN con DEFAULT volátil, CREATE INDEX
 * sin CONCURRENTLY, NOT NULL sin default en tabla grande, etc.
 *
 * Es ADVERTENCIA, no gate: reporta y sale 0. Muchos patrones que Squawk marca
 * son aceptables en tablas nuevas/vacías; el humano decide. Si más adelante
 * queremos que rompa el build, cambiar EXIT_ON_FINDINGS a true.
 *
 * Uso local:  node scripts/lint-new-migrations.mjs
 * En CI corre en el job de vigilancia sobre el diff del PR.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const EXIT_ON_FINDINGS = false;
const MIGRATIONS_DIR = "supabase/migrations";

function sh(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Base de comparación: origin/master si existe, si no el árbol actual (nada nuevo).
let base = "origin/master";
if (!sh(`git rev-parse --verify ${base} 2>/dev/null`)) {
  base = sh("git rev-parse --verify master 2>/dev/null") ? "master" : "";
}

let files = [];
if (base) {
  const diff = sh(
    `git diff --name-only --diff-filter=A ${base}...HEAD -- ${MIGRATIONS_DIR}`,
  );
  files = diff ? diff.split("\n").filter(Boolean) : [];
  // Fallback: cambios sin commitear (dev local).
  const staged = sh(
    `git diff --name-only --diff-filter=A --cached -- ${MIGRATIONS_DIR}`,
  );
  const unstaged = sh(`git status --porcelain -- ${MIGRATIONS_DIR}`)
    .split("\n")
    .filter((l) => l.startsWith("?? "))
    .map((l) => l.slice(3).trim());
  files = [
    ...new Set([...files, ...(staged ? staged.split("\n") : []), ...unstaged]),
  ].filter((f) => f.endsWith(".sql") && existsSync(f));
}

if (files.length === 0) {
  console.log(
    "lint-new-migrations: sin migraciones nuevas vs " +
      (base || "árbol") +
      " — nada que revisar.",
  );
  process.exit(0);
}

console.log(
  `lint-new-migrations: revisando ${files.length} migración(es) nueva(s):`,
);
files.forEach((f) => console.log("  • " + f));
console.log("");

let hadFindings = false;
try {
  execSync(`npx squawk ${files.map((f) => `'${f}'`).join(" ")}`, {
    stdio: "inherit",
  });
} catch {
  // squawk sale != 0 cuando encuentra algo.
  hadFindings = true;
}

if (!hadFindings)
  console.log("\n✅ Sin hallazgos de Squawk en las migraciones nuevas.");
process.exit(hadFindings && EXIT_ON_FINDINGS ? 1 : 0);
