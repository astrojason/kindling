import { describe, expect, it } from "vitest";
import { createStudyTimer } from "@random-knowledge/shared/study-timer";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; }, set: (ms: number) => { t = ms; } };
}

describe("createStudyTimer", () => {
  it("counts the time between start and pause", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 600);
    timer.start();
    c.advance(45_000);
    timer.pause();
    c.advance(99_000); // paused: not counted
    expect(timer.take()).toBe(45);
  });

  it("adds up separate stretches", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 600);
    timer.start(); c.advance(20_000); timer.pause();
    c.advance(80_000);
    timer.start(); c.advance(10_000); timer.pause();
    expect(timer.take()).toBe(30);
  });

  it("counts a stretch that is still running, and ignores a second start", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 600);
    timer.start(); c.advance(5_000); timer.start(); c.advance(5_000);
    expect(timer.take()).toBe(10);
  });

  it("caps each stretch, so a page left open overnight does not count as study time", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 180);
    timer.start(); c.advance(60 * 60 * 1000); timer.pause();
    timer.start(); c.advance(30_000); timer.pause();
    expect(timer.take()).toBe(210);
  });

  it("hands over whole seconds and keeps the fraction for next time", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 600);
    timer.start(); c.advance(1_700); timer.pause();
    expect(timer.take()).toBe(1);
    timer.start(); c.advance(400); timer.pause();
    expect(timer.take()).toBe(1); // 0.7 s left over + 0.4 s
  });

  it("does not count the same time twice when taken while running", () => {
    const c = clock();
    const timer = createStudyTimer(c.now, 600);
    timer.start(); c.advance(10_000);
    expect(timer.take()).toBe(10);
    c.advance(5_000);
    timer.pause();
    expect(timer.take()).toBe(5);
    expect(timer.take()).toBe(0);
  });

  it("never counts negative time if the clock goes backwards", () => {
    const c = clock(10_000);
    const timer = createStudyTimer(c.now, 600);
    timer.start(); c.set(2_000); timer.pause();
    expect(timer.take()).toBe(0);
  });

  it("is empty before anything starts", () => {
    expect(createStudyTimer(clock().now, 600).take()).toBe(0);
  });
});
