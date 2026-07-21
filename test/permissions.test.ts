import { describe, expect, it } from "vitest";
import { canManageRole, hasManageRoles } from "../src/permissions";

describe("canManageRole", () => {
  it("allows managing a role positioned below the bot's top role", () => {
    expect(canManageRole(10, 5)).toBe(true);
  });

  it("rejects a role at the same position as the bot's top role", () => {
    expect(canManageRole(10, 10)).toBe(false);
  });

  it("rejects a role positioned above the bot's top role", () => {
    expect(canManageRole(10, 15)).toBe(false);
  });
});

describe("hasManageRoles", () => {
  it("returns true when the MANAGE_ROLES bit is set", () => {
    expect(hasManageRoles(String(1n << 28n))).toBe(true);
  });

  it("returns true when combined with other permission bits", () => {
    const combined = (1n << 28n) | (1n << 3n);
    expect(hasManageRoles(String(combined))).toBe(true);
  });

  it("returns false when the MANAGE_ROLES bit is not set", () => {
    expect(hasManageRoles(String(1n << 3n))).toBe(false);
  });

  it("returns false for zero permissions", () => {
    expect(hasManageRoles("0")).toBe(false);
  });
});
