import { beforeEach, expect, it } from "vitest";
import { AUTH_HINT_KEY, AUTH_HINT_SCRIPT, writeAuthHint } from "./auth-hint";

beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as unknown as Storage;
  globalThis.document = { documentElement: { toggleAttribute: () => {} } } as unknown as Document;
});

it("remembers a signed-in session and forgets it on sign-out", () => {
  writeAuthHint(true);
  expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
  writeAuthHint(false);
  expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
});

it("ships a boot script that reads the same key", () => {
  expect(AUTH_HINT_SCRIPT).toContain(AUTH_HINT_KEY);
  expect(AUTH_HINT_SCRIPT).toContain("data-auth-hint");
});
