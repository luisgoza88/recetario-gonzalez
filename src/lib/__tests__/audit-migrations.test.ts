// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

let db: PGlite;
const user = "11111111-1111-4111-8111-111111111111";
const stranger = "22222222-2222-4222-8222-222222222222";
const home = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const proposal = "55555555-5555-4555-8555-555555555555";
const action = "66666666-6666-4666-8666-666666666666";
const read = (p: string) => readFileSync(resolve(p), "utf8");

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("src/lib/__tests__/fixtures/audit-schema.sql"));
  const commands = read(
    "supabase/migrations/20260119200000_ai_command_center.sql",
  );
  await db.exec(
    commands.slice(
      commands.indexOf("CREATE TABLE IF NOT EXISTS ai_audit_log"),
      commands.indexOf("-- Índices para ai_audit_log"),
    ),
  );
  await db.exec(
    commands.slice(
      commands.indexOf("CREATE TABLE IF NOT EXISTS ai_action_queue"),
      commands.indexOf("-- Índices para ai_action_queue"),
    ),
  );
  const security = read(
    "supabase/migrations/20260304000000_fix_critical_rls.sql",
  );
  await db.exec(
    security.slice(
      security.indexOf("CREATE OR REPLACE FUNCTION check_user_permission("),
      security.indexOf("-- 6f."),
    ),
  );
  await db.exec(
    read("supabase/migrations/20260304100000_fix_household_trigger.sql"),
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.startsWith("20260905"))
    .sort()) {
    await db.exec(read(`supabase/migrations/${file}`));
  }
  await db.exec(`SET test.uid = '${user}'; INSERT INTO auth.users VALUES('${user}'),('${stranger}');
    INSERT INTO households(id,name) VALUES('${home}','Uno'),('${other}','Dos');
    INSERT INTO ai_action_queue(proposal_id,household_id,user_id,session_id,summary,actions)
      VALUES('${proposal}','${home}','${user}','${action}','Prueba','[{"id":"${action}"}]');`);
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("September migration contracts in isolated PostgreSQL", () => {
  it("cannot impersonate the decision actor", async () => {
    await expect(
      db.query("select decide_ai_proposal($1, 'approved', $2)", [
        proposal,
        stranger,
      ]),
    ).rejects.toThrow("Invalid decision actor");
  });
  it("approves once, claims once and cannot reopen an executing proposal", async () => {
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select decide_ai_proposal($1, 'approved', $2) ok",
          [proposal, user],
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<{ ok: boolean }>("select claim_ai_proposal($1,$2) ok", [
          proposal,
          home,
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<{ ok: boolean }>("select claim_ai_proposal($1,$2) ok", [
          proposal,
          home,
        ])
      ).rows[0].ok,
    ).toBe(false);
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select decide_ai_proposal($1,'approved',$2) ok",
          [proposal, user],
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("rejects a foreign ingredient even when the user owns both households", async () => {
    await db.query(
      "insert into market_items(id, household_id) values('foreign',$1)",
      [other],
    );
    await expect(
      db.query(
        "insert into inventory(household_id,item_id) values($1,'foreign')",
        [home],
      ),
    ).rejects.toThrow("another household");
  });
  it("persists onboarding preferences and employee days together", async () => {
    const config = {
      name: "Mi hogar",
      members_count: 3,
      restrictions: ["vegetariano"],
      allergies: ["maní"],
      cuisine_template: "colombiana",
      spaces: [{ name: "Cocina", category: "interior" }],
      employees: [
        { name: "Persona", role: "Limpieza", workDays: ["lunes", "martes"] },
      ],
    };
    const result = await db.query<{ id: string }>(
      "select complete_household_onboarding(null,$1) id",
      [JSON.stringify(config)],
    );
    const stored = await db.query<{
      setup_completed: boolean;
      dietary_preferences: { allergies: string[] };
      cooking_profile: { family_size: number };
    }>("select * from households where id=$1", [result.rows[0].id]);
    expect(stored.rows[0].setup_completed).toBe(true);
    expect(stored.rows[0].dietary_preferences.allergies).toEqual(["maní"]);
    expect(stored.rows[0].cooking_profile.family_size).toBe(3);
  });
  it("rolls back the entire onboarding if an employee insert fails", async () => {
    const config = {
      name: "No guardar",
      members_count: 2,
      spaces: [],
      employees: [{ role: "Limpieza", workDays: [] }],
    };
    await expect(
      db.query("select complete_household_onboarding(null,$1)", [
        JSON.stringify(config),
      ]),
    ).rejects.toThrow();
    expect(
      (await db.query("select id from households where name='No guardar'"))
        .rows,
    ).toHaveLength(0);
  });
  it("restores a recorded value and refuses to overwrite a later manual edit", async () => {
    await db.query(
      "insert into recipes(id,household_id,name) values('undo-recipe',$1,'Después')",
      [home],
    );
    const before = {
      recipes: { id: "undo-recipe", household_id: home, name: "Antes" },
    };
    const after = {
      recipes: { id: "undo-recipe", household_id: home, name: "Después" },
    };
    const log = await db.query<{ id: string }>(
      "select create_ai_audit_log($1,$2,$3,'update_recipe') id",
      [home, user, action],
    );
    await db.query("select complete_ai_audit_log($1,'completed',null,$2,$3)", [
      log.rows[0].id,
      JSON.stringify(before),
      JSON.stringify(after),
    ]);
    const result = await db.query<{ result: { success: boolean } }>(
      "select rollback_ai_action($1,$2) result",
      [log.rows[0].id, user],
    );
    expect(result.rows[0].result.success).toBe(true);
    expect(
      (
        await db.query<{ name: string }>(
          "select name from recipes where id='undo-recipe'",
        )
      ).rows[0].name,
    ).toBe("Antes");
    const log2 = await db.query<{ id: string }>(
      "select create_ai_audit_log($1,$2,$3,'update_recipe') id",
      [home, user, action],
    );
    await db.query("select complete_ai_audit_log($1,'completed',null,$2,$3)", [
      log2.rows[0].id,
      JSON.stringify(before),
      JSON.stringify(after),
    ]);
    await db.query(
      "update recipes set name='Cambio manual' where id='undo-recipe'",
    );
    const rejected = await db.query<{ result: { success: boolean } }>(
      "select rollback_ai_action($1,$2) result",
      [log2.rows[0].id, user],
    );
    expect(rejected.rows[0].result.success).toBe(false);
    expect(
      (
        await db.query<{ name: string }>(
          "select name from recipes where id='undo-recipe'",
        )
      ).rows[0].name,
    ).toBe("Cambio manual");
  });
  it("enforces employee write permissions in the database", async () => {
    await db.query(
      "insert into household_memberships(user_id,household_id,role) values($1,$2,'empleado')",
      [stranger, home],
    );
    await db.exec(`SET test.uid = '${stranger}'`);
    try {
      await expect(
        db.query(
          "insert into recipes(id,household_id,name) values('blocked',$1,'No autorizado')",
          [home],
        ),
      ).rejects.toThrow("Missing household permission");
    } finally {
      await db.exec(`SET test.uid = '${user}'`);
    }
  });
  it("restricts legacy permissive reads and prevents self-assigned membership", async () => {
    await db.exec(`INSERT INTO recipes(id,household_id,name) VALUES('private-other','${other}','Privada');
      ALTER TABLE household_memberships ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT SELECT ON recipes TO authenticated;
      GRANT INSERT, SELECT ON household_memberships TO authenticated;
      CREATE POLICY legacy_public_recipe_read ON recipes FOR SELECT USING (true);
      CREATE POLICY legacy_self_membership ON household_memberships FOR INSERT WITH CHECK (user_id=auth.uid());
      SET test.uid='${stranger}'; SET ROLE authenticated;`);
    try {
      expect(
        (await db.query("select id from recipes where id='private-other'"))
          .rows,
      ).toHaveLength(0);
      await expect(
        db.query(
          "insert into household_memberships(user_id,household_id,role) values($1,$2,'admin')",
          [stranger, other],
        ),
      ).rejects.toThrow();
      await expect(
        db.query("select create_ai_proposal($1,$2,$3,'Spoof',1,'[]')", [
          other,
          user,
          action,
        ]),
      ).rejects.toThrow();
    } finally {
      await db.exec(`RESET ROLE; SET test.uid='${user}';`);
    }
  });
  it("redeems a varchar invitation role and grants family inventory access", async () => {
    await db.exec(`INSERT INTO household_invitations(household_id,token,code,role,expires_at,invited_by)
      VALUES('${other}','LIVE1234','LIVE1234','familia',now()+interval '1 day','${user}');
      SET test.uid='${stranger}';`);
    try {
      const result = await db.query<{ success: boolean; role: string }>(
        "select * from use_invitation_code('LIVE1234')",
      );
      expect(result.rows[0].success).toBe(true);
      expect(result.rows[0].role).toBe("familia");
      expect(
        (
          await db.query<{ allowed: boolean }>(
            "select check_user_permission($1,'update_inventory') allowed",
            [other],
          )
        ).rows[0].allowed,
      ).toBe(true);
      expect(
        (
          await db.query<{ success: boolean }>(
            "select * from use_invitation_code('LIVE1234')",
          )
        ).rows[0].success,
      ).toBe(false);
    } finally {
      await db.exec(`SET test.uid='${user}'`);
    }
  });
});
