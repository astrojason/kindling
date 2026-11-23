import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppColumn } from "./AppColumn";

const html = (props: { sidebar?: boolean; reading?: boolean }) => renderToStaticMarkup(createElement(AppColumn as ComponentType<{ sidebar?: boolean; reading?: boolean }>, props, "content"));

describe("AppColumn", () => {
  it("keeps the content clear of the desktop sidebar and of the mobile tab bar when the tab bar is shown", () => {
    const out = html({ sidebar: true });
    expect(out).toContain("lg:pl-60");
    expect(out).toContain("pb-28");
    expect(out).toContain("content");
  });

  it("uses the whole width, with no room left for a sidebar, when there is no tab bar", () => {
    const out = html({ sidebar: false });
    expect(out).not.toContain("lg:pl-60");
    expect(out).not.toContain("pb-28");
  });

  it("is narrow on a phone and wider on a desktop", () => {
    const out = html({ sidebar: true });
    expect(out).toContain("max-w-[560px]");
    expect(out).toContain("lg:max-w-4xl");
  });

  it("keeps a lesson being read to a comfortable reading width on a desktop", () => {
    const out = html({ sidebar: false, reading: true });
    expect(out).toContain("lg:max-w-2xl");
    expect(out).not.toContain("lg:max-w-4xl");
  });
});
