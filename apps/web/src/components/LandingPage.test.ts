// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ signIn: vi.fn(), error: null }) }));
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("shows the Kindling flame above the name", async () => {
  await act(async () => root.render(createElement(LandingPage)));
  const flame = container.querySelector("img[src='/icons/icon-192.png']");
  const heading = container.querySelector("h1");

  expect(flame).not.toBeNull();
  expect(flame?.getAttribute("alt")).toBe(""); // decorative: the name beside it already says it
  expect(heading?.textContent?.trim()).toBe("Kindling");
  expect(flame!.compareDocumentPosition(heading!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
