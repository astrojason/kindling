import { describe, expect, it } from "vitest";
import { adminLinkFromNotification } from "@random-knowledge/shared/notification-link";

const BASE = "https://kindling.astrojason.com";

describe("adminLinkFromNotification", () => {
  it("opens an admin path on the app's own site", () => {
    expect(adminLinkFromNotification({ url: "/admin/access" }, BASE)).toBe("https://kindling.astrojason.com/admin/access");
    expect(adminLinkFromNotification({ url: "/admin" }, BASE)).toBe("https://kindling.astrojason.com/admin");
  });

  it("copes with a trailing slash on the base URL", () => {
    expect(adminLinkFromNotification({ url: "/admin/access" }, `${BASE}/`)).toBe("https://kindling.astrojason.com/admin/access");
  });

  it.each([
    "https://evil.example.com/admin/access",
    "//evil.example.com/admin",
    "/admin/../etc",
    "/administrator",
    "/notes/1",
    "javascript:alert(1)",
    "admin/access",
    "",
  ])("refuses anything that is not an admin path (%s)", (url) => {
    expect(adminLinkFromNotification({ url }, BASE)).toBeNull();
  });

  it("returns null for a notification with no usable url, or no base URL configured", () => {
    expect(adminLinkFromNotification(undefined, BASE)).toBeNull();
    expect(adminLinkFromNotification({}, BASE)).toBeNull();
    expect(adminLinkFromNotification({ url: 5 }, BASE)).toBeNull();
    expect(adminLinkFromNotification({ url: "/admin/access" }, undefined)).toBeNull();
    expect(adminLinkFromNotification({ url: "/admin/access" }, "")).toBeNull();
  });
});
