import { expect, it } from "vitest";
import { startupScreen } from "@random-knowledge/shared/auth-guard";

const base = { authLoading: false, signedIn: true, accessLoading: false, access: "granted" } as const;

it("keeps starting while Firebase restores the saved session, instead of showing sign-in", () => {
  expect(startupScreen({ ...base, authLoading: true, signedIn: false, access: null })).toBe("starting");
});

it("shows sign-in only once Firebase says nobody is signed in", () => {
  expect(startupScreen({ ...base, signedIn: false, access: null })).toBe("sign-in");
});

it("keeps starting while access is checked, including the render before the check begins", () => {
  expect(startupScreen({ ...base, accessLoading: true, access: null })).toBe("starting");
  expect(startupScreen({ ...base, access: null })).toBe("starting");
});

it("routes resolved access", () => {
  expect(startupScreen(base)).toBe("app");
  expect(startupScreen({ ...base, access: "superadmin" })).toBe("app");
  expect(startupScreen({ ...base, access: "pending" })).toBe("pending");
  expect(startupScreen({ ...base, access: "denied" })).toBe("pending");
  expect(startupScreen({ ...base, access: "revoked" })).toBe("revoked");
});
