import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlanItem } from "@/lib/lesson-plan";
import { LessonRail } from "./LessonRail";

const plan = [
  { slot: 1, key: "2026-11-24", status: "ready", done: true, title: "First" },
  { slot: 2, key: "2026-11-24~2", status: "ready", done: false, title: "Second" },
  { slot: 3, key: "2026-11-24~3", status: "queued", done: false },
] as PlanItem[];

const html = (phase: string) => renderToStaticMarkup(createElement(LessonRail, { phase, plan, currentKey: "2026-11-24~2", onOpen: () => {}, onBack: () => {} }));

describe("LessonRail", () => {
  it("is hidden on a phone and marks the current step", () => {
    const out = html("quiz");
    expect(out).toContain("hidden");
    expect(out).toContain("lg:flex");
    expect(out).toMatch(/aria-current="step"[^>]*>(?:<span[^>]*>2<\/span>|<span[^>]*>3<\/span>)Quiz|Quiz/);
  });

  it("lists today's lessons with finished ones ticked and not-yet-ready ones disabled", () => {
    const out = html("lesson");
    expect(out).toContain("First");
    expect(out).toContain("Second");
    expect(out).toContain("✓");
    expect(out).toContain("disabled");
  });
});
