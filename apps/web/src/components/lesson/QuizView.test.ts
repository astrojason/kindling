// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/types";
import { QuizReview } from "./QuizReview";
import { QuizView } from "./QuizView";

const lesson = {
  quiz: [
    {
      question: String.raw`What does \(\Sigma\) denote?`,
      options: [String.raw`A sum, \(\sum x_i\)`, "A product"],
      correctIndex: 0,
      explanation: String.raw`\(\Sigma\) is the capital sigma.`,
    },
  ],
} as unknown as Lesson;

function mount(element: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  act(() => createRoot(container).render(element));
  return container;
}

describe("quiz math", () => {
  it("renders LaTeX in the question, options and explanation instead of showing raw backslashes", () => {
    const container = mount(createElement(QuizView, { lesson, quiz: { qIndex: 0, correct: 0, selected: 0 }, onSelect: () => {}, onNext: () => {} }));
    expect(container.querySelectorAll(".katex").length).toBe(3);
    expect(Array.from(container.querySelectorAll(".katex-html")).map((el) => el.textContent).join("")).not.toContain("\\");
  });

  it("renders LaTeX in the answer review too", () => {
    const container = mount(createElement(QuizReview, { lesson, answers: [0] }));
    expect(container.querySelectorAll(".katex").length).toBe(3);
  });
});
