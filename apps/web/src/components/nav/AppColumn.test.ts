import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppColumn } from "./AppColumn";

const html = (props: { sidebar?: boolean; reading?: boolean }) => renderToStaticMarkup(createElement(AppColumn as ComponentType<{ sidebar?: boolean; reading?: boolean }>, props, "content"));

describe("AppColumn", () => {
  it("keeps the content clear of the desktop sidebar when the tab bar is shown (the site footer clears the phone bar)", () => {
    const out = html({ sidebar: true });
    expect(out).toContain("lg:pl-[76px]");
    expect(out).toContain("content");
  });

  it("uses the whole width, with no room left for a sidebar, when there is no tab bar", () => {
    const out = html({ sidebar: false });
    expect(out).not.toContain("lg:pl-[76px]");
  });

  it("is narrow on a phone and wider on a desktop", () => {
    const out = html({ sidebar: true });
    expect(out).toContain("max-w-[560px]");
    expect(out).toContain("lg:max-w-6xl");
  });

  it("keeps a lesson being read to a comfortable reading width on a desktop", () => {
    const out = html({ sidebar: false, reading: true });
    expect(out).toContain("lg:max-w-5xl");
    expect(out).not.toContain("lg:max-w-6xl");
  });
});
