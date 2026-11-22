import { describe, expect, it } from "vitest";
import { estimateMinutes } from "./lesson-time";

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const question = { question: "q", options: [], correctIndex: 0, explanation: "" };

describe("estimateMinutes", () => {
  it("reads at 150 words a minute and adds 30 seconds per question", () => {
    expect(estimateMinutes({ body: [words(300)], quiz: [question, question, question] })).toBe(4);
  });
  it("is never below one minute", () => {
    expect(estimateMinutes({ body: ["hi"], quiz: [] })).toBe(1);
  });
});
