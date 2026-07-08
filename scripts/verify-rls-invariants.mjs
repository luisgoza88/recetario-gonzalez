#!/usr/bin/env node
/**
 * Invariantes RLS de Recetario — verificación VIVA contra la base real.
 *
 * Recetario es un gestor de hogar (hogares, empleados domésticos, mercado,
 * limpieza, menús). Guarda PII: usuarios, perfiles, hogares, empleados,
 * check-ins, compras, presupuestos. Con la ANON KEY (rol `anon`), un visitante
 * JAMÁS debe leer ninguna de esas tablas ni escribir. Verificado limpio vs prod
 * (snyelpbcfbzaxadrtxpa) el 2026-07-08: todas dan 401 (app requiere login).
 *
 * SEGURO contra prod. Env: SUPABASE_URL + SUPABASE_ANON_KEY. Sin env → skip.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.log("verify-rls-invariants: sin SUPABASE_URL/SUPABASE_ANON_KEY — omitido (skip).");
  process.exit(0);
}

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};
const GHOST = "00000000-0000-4000-8000-000000000000";

const NO_READ = [
  "users",
  "user_profiles",
  "households",
  "household_memberships",
  "employees",
  "home_employees",
  "employee_checkins",
  "purchases",
  "budgets",
  "inventory",
  "shopping_lists",
  "market_items",
  "subscriptions",
  "recipes",
];

const NO_WRITE = [
  { table: "purchases", body: { total: 1 } },
  { table: "shopping_lists", body: { name: "rls-probe" } },
  { table: "budgets", body: { name: "rls-probe" } },
];

let failures = 0;
const report = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failures++;
};

for (const table of NO_READ) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers: HEADERS });
    if (!res.ok) {
      report(true, `anon NO lee ${table} (HTTP ${res.status})`);
      continue;
    }
    const rows = await res.json().catch(() => null);
    report(Array.isArray(rows) && rows.length === 0, `anon NO lee ${table} (${Array.isArray(rows) ? rows.length : "?"} filas)`);
  } catch (e) {
    report(false, `anon lee ${table}: error de red ${e.message}`);
  }
}

for (const { table, body } of NO_WRITE) {
  try {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    report(!ins.ok, `anon NO inserta en ${table} (HTTP ${ins.status})`);
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${GHOST}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    });
    let updOk = !upd.ok;
    if (upd.ok) {
      const rows = await upd.json().catch(() => null);
      updOk = Array.isArray(rows) && rows.length === 0;
    }
    report(updOk, `anon NO actualiza ${table} (HTTP ${upd.status})`);
  } catch (e) {
    report(false, `sonda de escritura ${table}: error de red ${e.message}`);
  }
}

const total = NO_READ.length + NO_WRITE.length * 2;
console.log(failures === 0 ? `\n✅ ${total} invariantes RLS OK` : `\n❌ ${failures} invariante(s) RLS VIOLADO(S) — posible fuga de PII del hogar`);
process.exit(failures === 0 ? 0 : 1);
