import { describe, expect, it } from "vitest";
import { mergeRoleClaim } from "./claims";

describe("mergeRoleClaim", () => {
  it("adds a role without touching other claims", () => {
    expect(mergeRoleClaim({ superadmin: true }, "admin", true)).toEqual({ superadmin: true, admin: true });
    expect(mergeRoleClaim(undefined, "superadmin", true)).toEqual({ superadmin: true });
    expect(mergeRoleClaim(null, "admin", true)).toEqual({ admin: true });
  });

  it("removes a role by dropping the claim, keeping the others", () => {
    expect(mergeRoleClaim({ superadmin: true, admin: true, other: 1 }, "admin", false)).toEqual({ superadmin: true, other: 1 });
    expect(mergeRoleClaim({ admin: true }, "admin", false)).toEqual({});
  });

  it("does not change the object it was given", () => {
    const claims = { admin: true };
    mergeRoleClaim(claims, "admin", false);
    expect(claims).toEqual({ admin: true });
  });

  it("refuses a role that is not admin or superadmin", () => {
    expect(() => mergeRoleClaim({}, "owner" as never, true)).toThrow(/role/i);
  });
});
