import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

it("links to support, the privacy policy and the terms", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  for (const href of ["/support", "/privacy", "/terms"]) expect(html).toContain(`href="${href}"`);
});

it("clears the fixed tab bar only on pages that show it", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  expect(html).toContain("group-has-[[data-tabbar]]/app:pb-24");
  expect(html).toContain("lg:group-has-[[data-tabbar]]/app:pl-[76px]");
});
