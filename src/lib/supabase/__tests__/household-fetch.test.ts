// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createHouseholdFetch } from "../household-fetch";
const home = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const url = "https://example.supabase.co/rest/v1/recipes";

describe("active household transport", () => {
  it("blocks tenant queries before a household is selected", async () => {
    const network = vi.fn();
    expect((await createHouseholdFetch(() => null, network)(url)).status).toBe(
      403,
    );
    expect(network).not.toHaveBeenCalled();
  });
  it("adds an AND filter without replacing caller restrictions", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("[]"));
    await createHouseholdFetch(
      () => home,
      network,
    )(`${url}?household_id=eq.${other}&select=id`);
    expect(
      new URL(String(network.mock.calls[0][0])).searchParams.getAll(
        "household_id",
      ),
    ).toEqual([`eq.${other}`, `eq.${home}`]);
  });
  it("assigns bulk inserts to the selected household including PostgREST columns", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("[]"));
    await createHouseholdFetch(() => home, network)(`${url}?columns=name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ name: "Sopa" }]),
    });
    expect(
      JSON.parse(network.mock.calls[0][1]!.body as string)[0].household_id,
    ).toBe(home);
    expect(
      new URL(String(network.mock.calls[0][0])).searchParams.get("columns"),
    ).toContain("household_id");
  });
  it("rejects writes that try to move a row to another household", async () => {
    const network = vi.fn();
    const response = await createHouseholdFetch(() => home, network)(url, {
      method: "PATCH",
      body: JSON.stringify({ household_id: other }),
    });
    expect(response.status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });
  it("does not interfere with authentication or loading memberships", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("[]"));
    await createHouseholdFetch(
      () => null,
      network,
    )("https://example.supabase.co/rest/v1/household_memberships");
    expect(network).toHaveBeenCalledOnce();
  });
  it("does not duplicate household_id in bulk insert columns", async () => {
    const network = vi.fn<typeof fetch>(async () => new Response("[]"));
    await createHouseholdFetch(() => home, network)(
      `${url}?columns=%22name%22,%22household_id%22`,
      {
        method: "POST",
        body: JSON.stringify([{ name: "Sopa", household_id: home }]),
      },
    );
    expect(
      new URL(String(network.mock.calls[0][0])).searchParams.get("columns"),
    ).toBe('"name","household_id"');
  });
  it("discards a response when the active household changes during the request", async () => {
    let active = home;
    const network = vi.fn<typeof fetch>(async () => {
      active = other;
      return new Response('[{"name":"privado"}]');
    });
    const response = await createHouseholdFetch(() => active, network)(url);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("privado");
  });
});
