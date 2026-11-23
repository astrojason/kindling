import { describe, expect, it } from "vitest";
import { canManageAccess, hasAppAccess, isAdmin, isSuperadmin, requestsForAdmin, resolveAccess, type AccessRequest } from "./auth-guard";

describe("isSuperadmin", () => {
  it("is true when the superadmin claim is set", () => {
    expect(isSuperadmin({ superadmin: true })).toBe(true);
  });

  it("is false when the claim is absent, false, or claims are missing", () => {
    expect(isSuperadmin({})).toBe(false);
    expect(isSuperadmin({ superadmin: false })).toBe(false);
    expect(isSuperadmin(null)).toBe(false);
    expect(isSuperadmin(undefined)).toBe(false);
  });
});

describe("resolveAccess", () => {
  const request = (status: AccessRequest["status"]): AccessRequest => ({
    uid: "u1",
    email: "u1@example.com",
    displayName: "U1",
    status,
    firstSeenAt: "2026-09-01",
    lastSeenAt: "2026-09-01",
  });

  it("denies signed-out users", () => {
    expect(resolveAccess(null, null, null)).toBe("denied");
  });

  it("resolves superadmin regardless of any request doc", () => {
    expect(resolveAccess("u1", { superadmin: true }, null)).toBe("superadmin");
    expect(resolveAccess("u1", { superadmin: true }, request("revoked"))).toBe("superadmin");
  });

  it("treats a missing request as pending", () => {
    expect(resolveAccess("u1", {}, null)).toBe("pending");
  });

  it("passes through the request's status", () => {
    expect(resolveAccess("u1", {}, request("pending"))).toBe("pending");
    expect(resolveAccess("u1", {}, request("granted"))).toBe("granted");
    expect(resolveAccess("u1", {}, request("revoked"))).toBe("revoked");
  });
});

describe("requestsForAdmin", () => {
  const request = (uid: string, status: AccessRequest["status"] = "pending"): AccessRequest => ({
    uid,
    email: `${uid}@example.com`,
    displayName: uid,
    status,
    firstSeenAt: "2026-09-01",
    lastSeenAt: "2026-09-01",
  });

  it("excludes the viewer's own request, e.g. a leftover doc from before they became superadmin", () => {
    const requests = [request("admin-uid"), request("u1"), request("u2", "granted")];
    expect(requestsForAdmin(requests, "admin-uid")).toEqual([request("u1"), request("u2", "granted")]);
  });

  it("leaves the list unchanged when the viewer has no request of their own", () => {
    const requests = [request("u1"), request("u2")];
    expect(requestsForAdmin(requests, "admin-uid")).toEqual(requests);
  });
});

describe("hasAppAccess", () => {
  it("is true only for superadmin and granted", () => {
    expect(hasAppAccess("superadmin")).toBe(true);
    expect(hasAppAccess("granted")).toBe(true);
    expect(hasAppAccess("pending")).toBe(false);
    expect(hasAppAccess("revoked")).toBe(false);
    expect(hasAppAccess("denied")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("is true only for an explicit admin claim", () => {
    expect(isAdmin({ admin: true })).toBe(true);
    expect(isAdmin({ admin: false })).toBe(false);
    expect(isAdmin({ superadmin: true })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("canManageAccess", () => {
  it("is true for an admin or a superadmin and nobody else", () => {
    expect(canManageAccess({ admin: true })).toBe(true);
    expect(canManageAccess({ superadmin: true })).toBe(true);
    expect(canManageAccess({})).toBe(false);
    expect(canManageAccess(undefined)).toBe(false);
  });
});

describe("admin access", () => {
  it("resolves an admin claim to admin without needing an access request", () => {
    expect(resolveAccess("u1", { admin: true }, null)).toBe("admin");
  });

  it("lets a superadmin who is also an admin stay a superadmin", () => {
    expect(resolveAccess("u1", { superadmin: true, admin: true }, null)).toBe("superadmin");
  });

  it("gives an admin app access", () => {
    expect(hasAppAccess("admin")).toBe(true);
  });
});
