import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ResetDataLink } from "./ResetDataLink";

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/lib/firestore", () => ({ resetAllUserData: vi.fn() }));

it("offers the reset without asking or deleting until it is clicked", () => {
  const html = renderToStaticMarkup(createElement(ResetDataLink, { uid: "u1", onReset: vi.fn() }));
  expect(html).toContain("Reset my data");
  expect(html).not.toContain("alertdialog");
});
