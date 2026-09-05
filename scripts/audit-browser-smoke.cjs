/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node test harness. */
/* Local browser smoke test using synthetic data. No writes reach Supabase or AI. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3187";
const output = process.env.SMOKE_OUTPUT || "/tmp/recetario-browser-smoke";
const uid = "11111111-1111-4111-8111-111111111111";
const hid = "33333333-3333-4333-8333-333333333333";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "demo@example.test",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Persona de prueba" },
  created_at: new Date().toISOString(),
};
const jwt = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ),
  Buffer.from(
    JSON.stringify({
      sub: uid,
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url"),
  "test-signature",
].join(".");
const session = {
  access_token: jwt,
  refresh_token: "synthetic-refresh",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user,
};
const household = {
  id: hid,
  name: "Hogar de prueba",
  owner_id: uid,
  setup_completed: true,
  settings: {},
  cooking_profile: { family_size: 3 },
  dietary_preferences: {},
};
const recipe = {
  id: "recipe-demo",
  household_id: hid,
  name: "Arroz de prueba",
  type: "lunch",
  ingredients: [{ name: "Arroz", total: "500 g" }],
  steps: ["Lavar el arroz.", "Cocinar con agua."],
  prep_time: 10,
  cook_time: 20,
  image_url: null,
  thermomix_compatible: false,
};
const calls = [],
  errors = [],
  checks = [];
let invitationCalls = 0;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "allow",
    });
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const json = (data) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      // A real registration without a fetch handler keeps synthetic API routing deterministic.
      if (url.pathname === "/sw.js")
        return route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "self.addEventListener('install',()=>self.skipWaiting());",
        });
      if (url.pathname.startsWith("/auth/v1/"))
        return json(url.pathname.endsWith("/user") ? user : session);
      if (url.pathname.startsWith("/rest/v1/")) {
        const table = url.pathname.split("/").pop();
        calls.push({
          table,
          method: req.method(),
          household: url.searchParams.getAll("household_id"),
        });
        if (url.pathname.includes("/rpc/")) return json(true);
        let rows = [];
        if (table === "user_profiles")
          rows = [{ ...user, full_name: "Persona de prueba" }];
        if (table === "household_memberships")
          rows = [
            {
              id: "membership-demo",
              user_id: uid,
              household_id: hid,
              role: "admin",
              is_active: true,
              permissions: {},
              household,
            },
          ];
        if (table === "households") rows = [household];
        if (table === "recipes") rows = [recipe];
        if (table === "market_items")
          rows = [
            {
              id: "rice-demo",
              household_id: hid,
              name: "Arroz",
              quantity: "1 kg",
              category: "Granos",
              order_index: 1,
            },
          ];
        if (table === "inventory")
          rows = [
            {
              id: "inv-demo",
              household_id: hid,
              item_id: "rice-demo",
              current_quantity: "250 g",
              current_number: 250,
            },
          ];
        if (table === "generated_menus")
          rows = [
            {
              id: "menu-demo",
              household_id: hid,
              week_start_date: "2026-08-31",
              status: "approved",
              created_at: new Date().toISOString(),
              menu_data: [
                {
                  date: today,
                  dayName: "Hoy",
                  dayNumber: 0,
                  breakfast: null,
                  lunch: recipe,
                  dinner: null,
                },
              ],
            },
          ];
        if (table === "day_menu")
          rows = [
            {
              id: "day-demo",
              household_id: hid,
              day_number: 3,
              breakfast: null,
              lunch: recipe,
              dinner: null,
              reminder: null,
            },
          ];
        const single = (req.headers().accept || "").includes(
          "vnd.pgrst.object",
        );
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
          },
          body:
            req.method() === "HEAD"
              ? ""
              : JSON.stringify(single ? rows[0] || null : rows),
        });
      }
      if (url.pathname === "/api/validate-invitation") {
        invitationCalls++;
        return json({
          isValid: true,
          householdName: "Hogar de prueba",
          invitation: { id: "invite-demo", role: "familia" },
        });
      }
      if (url.pathname.startsWith("/api/"))
        return json({ items: [], success: true });
      if (url.origin === base) return route.continue();
      if (req.resourceType() === "image")
        return route.fulfill({
          status: 200,
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        });
      return json({});
    });
    const page = await context.newPage();
    if (page.routeWebSocket)
      await page.routeWebSocket("**/*", (socket) => socket.close());
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/join?code=ABCD-1234`);
    await page.waitForTimeout(900);
    assert(invitationCalls === 1, "Invitation URL validates once");
    assert(
      !(await page.locator("body").innerText()).includes("Espera un momento"),
      "Valid invitation has no throttling error",
    );
    await page.goto(
      `${base}/auth/login?redirect=${encodeURIComponent("/?section=recetario&tab=recipes")}`,
    );
    await page.locator("input[type=email]").fill("demo@example.test");
    await page.locator("input[type=password]").fill("SyntheticPassword123");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/?section=recetario&tab=recipes");
    await page.waitForTimeout(1300);
    assert(
      (await page.locator("body").innerText()).includes("Arroz de prueba"),
      "Authenticated fixture opens the requested recipe tab",
    );
    await page.screenshot({
      path: `${output}/recipes-mobile.png`,
      fullPage: false,
    });
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await nav.getByRole("button", { name: "Hogar", exact: true }).click();
    await page.waitForTimeout(350);
    assert(
      new URL(page.url()).searchParams.get("section") === "hogar",
      "Navigation writes the section URL",
    );
    await page.goBack();
    await page.waitForTimeout(500);
    assert(
      new URL(page.url()).searchParams.get("tab") === "recipes",
      "Browser Back restores the recipe tab",
    );
    await nav.getByRole("button", { name: "Mercado", exact: true }).click();
    await page.waitForTimeout(700);
    assert(
      new URL(page.url()).searchParams.get("tab") === "market",
      "Shopping tab has a direct URL",
    );
    await page.screenshot({
      path: `${output}/shopping-mobile.png`,
      fullPage: false,
    });
    await page
      .getByRole("button", { name: "Asistente de IA", exact: true })
      .click();
    await page.getByRole("button", { name: "Cerrar asistente" }).waitFor();
    assert(
      (await page.locator("body").innerText()).includes("Asistente Recetario"),
      "Single AI entry opens the conversation",
    );
    await page.getByRole("button", { name: "Cerrar asistente" }).click();
    await page
      .getByRole("button", { name: "Asistente de IA", exact: true })
      .press("ArrowUp");
    await page.getByRole("button", { name: "Al mercado", exact: true }).click();
    await page
      .getByRole("heading", { name: "Agregar al mercado", exact: true })
      .waitFor();
    assert(true, "Quick action opens the add-product form");
    await page.keyboard.press("Escape");
    await context.setOffline(true);
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Arroz.*1 kg/ }).click();
    const readQueue = () =>
      page.evaluate(async () => {
        const scope = localStorage.getItem("recetario-session-scope");
        return new Promise((resolve, reject) => {
          const req = indexedDB.open(`recetario-offline:${scope}`);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            const read = db
              .transaction("pendingOperations")
              .objectStore("pendingOperations")
              .getAll();
            read.onsuccess = () => {
              db.close();
              resolve(read.result);
            };
            read.onerror = () => reject(read.error);
          };
        });
      });
    await page.waitForTimeout(400);
    const pending = await readQueue();
    assert(
      pending.length === 2 &&
        pending.every((op) => (op.data.item_id || op.data.id) === "rice-demo"),
      "Offline purchase preserves checklist and inventory operations in the scoped queue",
    );
    await context.setOffline(false);
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await readQueue()).length === 0) break;
      await page.waitForTimeout(100);
    }
    assert(
      (await readQueue()).length === 0,
      "Reconnection synchronizes and clears confirmed operations",
    );
    const scopedTables = [
      "recipes",
      "market_items",
      "inventory",
      "market_checklist",
      "generated_menus",
      "day_menu",
      "scheduled_tasks",
      "spaces",
      "home_employees",
    ];
    assert(
      calls
        .filter((c) => scopedTables.includes(c.table))
        .every((c) => c.household.includes(`eq.${hid}`)),
      "Every observed household data request has the active household filter",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Mobile layout does not overflow horizontally",
    );
    if (errors.length) console.error(JSON.stringify({ errors }));
    assert(errors.length === 0, "No browser runtime exceptions");
    const report = { checks, errors, requests: calls, synthetic: true };
    fs.writeFileSync(`${output}/browser.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
