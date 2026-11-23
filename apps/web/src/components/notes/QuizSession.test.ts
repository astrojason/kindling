// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NoteSession } from "@random-knowledge/shared/notes";
import { computeSM2 } from "@random-knowledge/shared/sm2";
import { streamChat } from "@/lib/chat-stream";
import { nowMs } from "@/lib/clock";
import { addStats } from "@/lib/firestore";
import { todayStr } from "@/lib/date";
import { createSession, getCompletedSessions, getIncompleteSession, incrementNotesStats, updateNoteAfterRating, updateSession } from "@/lib/notes-firestore";
import { QuizSession } from "./QuizSession";

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/chat-stream", () => ({ streamChat: vi.fn() }));
vi.mock("@/lib/clock", () => ({ nowMs: vi.fn() }));
vi.mock("@/lib/firestore", () => ({ addStats: vi.fn() }));
vi.mock("@/lib/notes-firestore", () => ({
  createSession: vi.fn(), getIncompleteSession: vi.fn(), getCompletedSessions: vi.fn(),
  updateSession: vi.fn(), updateNoteAfterRating: vi.fn(), incrementNotesStats: vi.fn(),
}));

const note = { id: "n1", title: "Black holes", tag: "physics", what_it_said: "W", why_it_matters: "Y", application: "A", interval_days: 6, easiness_factor: 2.5, session_count: 2 } as unknown as Note;
const session = (over: Partial<NoteSession> = {}): NoteSession => ({ id: "s1", note_id: "n1", messages: [], completed_at: null, self_rating: null, suggested_rating: null, ...over });
const CLOSING = "You understand the basics.\nRATING:4\nSESSION_COMPLETE";

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getIncompleteSession).mockResolvedValue(null);
  vi.mocked(getCompletedSessions).mockResolvedValue([]);
  vi.mocked(createSession).mockResolvedValue("s1");
  vi.mocked(updateSession).mockResolvedValue(undefined);
  vi.mocked(updateNoteAfterRating).mockResolvedValue(undefined);
  vi.mocked(incrementNotesStats).mockResolvedValue(undefined);
  vi.mocked(addStats).mockResolvedValue(undefined);
  vi.mocked(nowMs).mockReturnValue(0);
  vi.mocked(streamChat).mockResolvedValue("What is a black hole?");
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(QuizSession, { uid: "u1", note, getToken: async () => "tok" })));
const setValue = (el: Element, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const answerBox = () => container.querySelector("textarea[aria-label='Your answer']") as HTMLTextAreaElement;
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const click = (el: Element | undefined) => act(async () => (el as HTMLElement).click());
const answer = async (text: string) => { await setValue(answerBox(), text); await click(button("Send")); };

it("starts a new session and streams the coach's opening question", async () => {
  await render();

  expect(createSession).toHaveBeenCalledWith("u1", "n1");
  expect(streamChat).toHaveBeenCalledWith(expect.objectContaining({ token: "tok", messages: [], noteContext: { what_it_said: "W", why_it_matters: "Y", application: "A" } }));
  expect(container.textContent).toContain("What is a black hole?");
  expect(updateSession).toHaveBeenCalledWith("u1", "s1", { messages: [{ role: "assistant", content: "What is a black hole?" }] });
});

it("resumes an unfinished session instead of starting another", async () => {
  vi.mocked(getIncompleteSession).mockResolvedValue(session({ messages: [{ role: "assistant", content: "Earlier question?" }] }));
  await render();

  expect(createSession).not.toHaveBeenCalled();
  expect(streamChat).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Earlier question?");
});

it("sends an answer, streams the reply and saves the conversation", async () => {
  await render();
  vi.mocked(streamChat).mockResolvedValue("Good, now why does light bend?");
  await answer("A region of no escape");

  expect(vi.mocked(streamChat).mock.calls[1][0].messages).toEqual([
    { role: "assistant", content: "What is a black hole?" },
    { role: "user", content: "A region of no escape" },
  ]);
  expect(container.textContent).toContain("A region of no escape");
  expect(container.textContent).toContain("Good, now why does light bend?");
  expect(updateSession).toHaveBeenLastCalledWith("u1", "s1", { messages: expect.arrayContaining([{ role: "user", content: "A region of no escape" }]) });
  expect(answerBox().value).toBe("");
});

it("shows progress and locks the answer box while the coach replies", async () => {
  await render();
  let finish!: (reply: string) => void;
  vi.mocked(streamChat).mockReturnValue(new Promise<string>((resolve) => { finish = resolve; }));
  await answer("My answer");

  expect(answerBox().disabled).toBe(true);
  expect(button("Thinking…").disabled).toBe(true);

  await act(async () => finish("Next question?"));
  expect(answerBox().disabled).toBe(false);
});

it("shows the closing assessment without the markers, saves the completion and offers the rating", async () => {
  await render();
  vi.mocked(streamChat).mockResolvedValue(CLOSING);
  await answer("My answer");

  expect(container.textContent).toContain("You understand the basics.");
  expect(container.textContent).toContain("Suggested rating: hot");
  expect(container.textContent).not.toMatch(/SESSION_COMPLETE|RATING:4/);
  expect(updateSession).toHaveBeenLastCalledWith("u1", "s1", expect.objectContaining({ completed_at: expect.any(Date), suggested_rating: 4 }));
  expect(container.querySelector("button[aria-label='Rate 4 hot']")?.getAttribute("aria-pressed")).toBe("true");
  expect(container.querySelector("textarea[aria-label='Your answer']")).toBeNull();
});

it("saves the chosen rating through SM-2, counts the session, and returns to the note", async () => {
  await render();
  vi.mocked(streamChat).mockResolvedValue(CLOSING);
  await answer("My answer");
  await click(container.querySelector("button[aria-label='Rate 5 solid']")!);
  await click(button("Save rating"));

  const expected = computeSM2({ rating: 5, intervalDays: 6, easinessFactor: 2.5, sessionCount: 2 });
  const [, , sm2, rating] = vi.mocked(updateNoteAfterRating).mock.calls[0];
  expect(rating).toBe(5);
  expect(sm2).toMatchObject({ intervalDays: expected.intervalDays, easinessFactor: expected.easinessFactor, sessionCount: 3 });
  expect(updateSession).toHaveBeenLastCalledWith("u1", "s1", { self_rating: 5 });
  expect(incrementNotesStats).toHaveBeenCalledWith("u1", { total_sessions: 1, passing_sessions: 1 });
  expect(toast).toHaveBeenCalledWith("Recall saved.");
  expect(push).toHaveBeenCalledWith("/notes/n1");
});

it("does not count a failing rating as a pass", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([session({ completed_at: {} as never, suggested_rating: 2 })]);
  await render();
  await click(button("Save rating"));

  expect(vi.mocked(updateNoteAfterRating).mock.calls[0][3]).toBe(2);
  expect(incrementNotesStats).toHaveBeenCalledWith("u1", { total_sessions: 1 });
});

it("goes straight to the rating for a session that finished but was never rated", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([session({ completed_at: {} as never, suggested_rating: 3 })]);
  await render();

  expect(createSession).not.toHaveBeenCalled();
  expect(container.querySelector("button[aria-label='Rate 3 warm']")?.getAttribute("aria-pressed")).toBe("true");
});

it("shows a failed reply in full, restores the answer, and retries it", async () => {
  await render();
  vi.mocked(streamChat).mockRejectedValueOnce(new Error("Daily token limit reached (250,000 / 250,000)")).mockResolvedValue("Second try reply");
  await answer("My answer");

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Daily token limit reached (250,000 / 250,000)");
  expect(alert?.className).toContain("select-all");
  expect(container.textContent).not.toContain("My answer"); // the failed turn is not left half-sent
  await click(button("Retry"));

  expect(container.textContent).toContain("Second try reply");
  expect(container.querySelector("[role='alert']")).toBeNull();
});

it("tells the user when a reply could not be saved, rather than carrying on silently", async () => {
  await render();
  vi.mocked(updateSession).mockRejectedValue(new Error("Missing or insufficient permissions."));
  vi.mocked(streamChat).mockResolvedValue("Next question?");
  await answer("My answer");

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(container.textContent).toContain("Next question?");
});

it("refuses to start a turn offline and says why", async () => {
  await render();
  vi.stubGlobal("navigator", { onLine: false });
  await answer("My answer");

  expect(container.querySelector("[role='alert']")?.textContent).toMatch(/internet connection/i);
  expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1); // only the opener
});

it("sends on Enter and keeps Shift+Enter for a new line", async () => {
  await render();
  vi.mocked(streamChat).mockResolvedValue("Next?");
  await setValue(answerBox(), "Line one");
  await act(async () => { answerBox().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true })); });
  expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(1);
  await act(async () => { answerBox().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  expect(vi.mocked(streamChat)).toHaveBeenCalledTimes(2);
});

it("shows a failed rating save in full and stays on the rating, without counting the session", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([session({ completed_at: {} as never, suggested_rating: 4 })]);
  vi.mocked(updateNoteAfterRating).mockRejectedValue(new Error("quota exceeded"));
  await render();
  await click(button("Save rating"));

  expect(container.querySelector("[role='alert']")?.textContent).toContain("quota exceeded");
  expect(incrementNotesStats).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  expect(button("Save rating").disabled).toBe(false);
});

it("reports a failed stats update instead of hiding it, and still returns to the note", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([session({ completed_at: {} as never, suggested_rating: 4 })]);
  vi.mocked(incrementNotesStats).mockRejectedValue(new Error("stats down"));
  await render();
  await click(button("Save rating"));

  expect(toast).toHaveBeenCalledWith(expect.stringContaining("stats down"));
  expect(push).toHaveBeenCalledWith("/notes/n1");
});

it("shows a failure to open the session in full", async () => {
  vi.mocked(getIncompleteSession).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
});

describe("time spent", () => {
  it("counts the time spent answering and rating toward today's learning time", async () => {
    vi.mocked(nowMs).mockReturnValue(1_000); // the opening question appears
    await render();
    vi.mocked(nowMs).mockReturnValue(31_000); // 30 s later the answer is sent
    vi.mocked(streamChat).mockResolvedValue(CLOSING);
    await answer("My answer");
    vi.mocked(nowMs).mockReturnValue(40_000); // the closing assessment appeared at 31 s: 9 s before the rating is saved
    await click(button("Save rating"));

    expect(addStats).toHaveBeenCalledWith("u1", todayStr(), { seconds: 39 });
  });

  it("caps one slow turn, so a tab left open does not count as study time", async () => {
    vi.mocked(nowMs).mockReturnValue(0);
    await render();
    vi.mocked(nowMs).mockReturnValue(60 * 60 * 1000); // an hour away
    vi.mocked(streamChat).mockResolvedValue(CLOSING);
    await answer("My answer");
    await click(button("Save rating"));

    const { seconds } = vi.mocked(addStats).mock.calls[0][2] as { seconds: number };
    expect(seconds).toBeLessThanOrEqual(180 + 180);
    expect(seconds).toBeGreaterThanOrEqual(180);
  });

  it("records no time when none was spent", async () => {
    vi.mocked(getCompletedSessions).mockResolvedValue([session({ completed_at: {} as never, suggested_rating: 4 })]);
    await render();
    await click(button("Save rating"));
    expect(addStats).not.toHaveBeenCalled();
  });

  it("says so when the time could not be recorded, and still returns to the note", async () => {
    vi.mocked(nowMs).mockReturnValue(0);
    await render();
    vi.mocked(nowMs).mockReturnValue(20_000);
    vi.mocked(streamChat).mockResolvedValue(CLOSING);
    await answer("My answer");
    vi.mocked(addStats).mockRejectedValue(new Error("stats down"));
    await click(button("Save rating"));

    expect(toast).toHaveBeenCalledWith(expect.stringContaining("stats down"));
    expect(toast).not.toHaveBeenCalledWith("Recall saved.");
    expect(push).toHaveBeenCalledWith("/notes/n1");
  });
});
