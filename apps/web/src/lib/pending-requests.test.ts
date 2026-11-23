import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...parts: string[]) => parts.join("/")),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  onSnapshot: vi.fn(),
}));

import { onSnapshot } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { subscribeToPendingRequests } from "@random-knowledge/shared/pending-requests";

const db = {} as Firestore;
beforeEach(() => vi.clearAllMocks());

describe("subscribeToPendingRequests", () => {
  it("watches the access requests that are still pending", () => {
    vi.mocked(onSnapshot).mockReturnValue((() => {}) as never);
    subscribeToPendingRequests(db, "me", vi.fn(), vi.fn());
    const [q] = vi.mocked(onSnapshot).mock.calls[0] as unknown as [{ col: string; constraints: unknown[] }];
    expect(q.col).toBe("accessRequests");
    expect(q.constraints).toEqual([{ field: "status", op: "==", value: "pending" }]);
  });

  it("reports how many are waiting, leaving out the viewer's own request", () => {
    vi.mocked(onSnapshot).mockReturnValue((() => {}) as never);
    const onCount = vi.fn();
    subscribeToPendingRequests(db, "me", onCount, vi.fn());
    const next = vi.mocked(onSnapshot).mock.calls[0][1] as unknown as (s: unknown) => void;

    next({ docs: [{ id: "a" }, { id: "me" }, { id: "b" }] });
    expect(onCount).toHaveBeenLastCalledWith(2);
    next({ docs: [{ id: "me" }] });
    expect(onCount).toHaveBeenLastCalledWith(0);
  });

  it("passes a failed subscription on to the caller", () => {
    vi.mocked(onSnapshot).mockReturnValue((() => {}) as never);
    const onError = vi.fn();
    subscribeToPendingRequests(db, "me", vi.fn(), onError);
    const err = new Error("Missing or insufficient permissions.");
    (vi.mocked(onSnapshot).mock.calls[0][2] as unknown as (e: Error) => void)(err);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("returns the unsubscribe function", () => {
    const unsubscribe = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsubscribe as never);
    expect(subscribeToPendingRequests(db, "me", vi.fn(), vi.fn())).toBe(unsubscribe);
  });
});
