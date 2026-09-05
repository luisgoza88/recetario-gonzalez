import { describe, it, expect } from "vitest";
import { householdDate, menuCycleDay } from "../menu-date";
import { shoppingRequirement } from "../shopping-quantities";
import { safeRedirect } from "../safe-redirect";

describe("audit regressions", () => {
  it("keeps the Colombian date after midnight UTC", () => {
    expect(householdDate(new Date("2026-09-05T01:00:00Z"))).toBe("2026-09-04");
  });
  it("uses the same cycle day regardless of UTC hour within a local date", () => {
    expect(menuCycleDay(new Date("2026-09-04T17:00:00Z"))).toBe(3);
    expect(menuCycleDay(new Date("2026-09-05T01:00:00Z"))).toBe(3);
    expect(menuCycleDay(new Date("2026-09-06T17:00:00Z"))).toBe(-1);
  });
  it("sums compatible requirements and subtracts actual stock", () => {
    const result = shoppingRequirement(["1 kg", "500 g"], "250 g");
    expect(result.inStock).toBe(false);
    expect(result.quantity).toContain("1250");
  });
  it("does not treat a small stock as enough for the week", () => {
    expect(shoppingRequirement(["1 kg"], "5 g").inStock).toBe(false);
    expect(shoppingRequirement(["1 kg"], "1500 g").inStock).toBe(true);
  });
  it("keeps unknown or incompatible quantities for human review", () => {
    expect(shoppingRequirement(["al gusto"], "2 g").inStock).toBe(false);
    expect(shoppingRequirement(["1 litro", "1 kg"], "10 kg").inStock).toBe(
      false,
    );
  });
  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/\n/evil.example",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeRedirect(value)).toBe("/");
  });
  it("preserves invitations and app navigation", () => {
    expect(safeRedirect("/join?code=ABCD1234")).toBe("/join?code=ABCD1234");
  });
});
