import { NextResponse } from "next/server";
import { DAILY_TOKEN_LIMIT, getTokensUsedToday, reportTokensUsed, TokenTrackerError } from "@/lib/token-budget";

/**
 * Stops a request that would spend OpenAI tokens once the daily budget is gone. Fails closed: when the
 * tracker can't say how much was spent, the response says why instead of assuming the budget is unspent.
 * Returns the response to send, or null when the request may proceed.
 */
export async function tokenBudgetGate(): Promise<NextResponse | null> {
  try {
    const used = await getTokensUsedToday();
    if (used >= DAILY_TOKEN_LIMIT) {
      return NextResponse.json({ error: `Daily token limit reached (${used.toLocaleString()} / ${DAILY_TOKEN_LIMIT.toLocaleString()})` }, { status: 429 });
    }
    return null;
  } catch (err) {
    console.error("Token budget check failed", err);
    const message = err instanceof TokenTrackerError ? err.message : `Could not check the token budget: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

/** Reports spent tokens. A failed report is logged but never fails the answer the user already received. */
export async function reportTokens(count: number | undefined): Promise<void> {
  if (!count) return;
  await reportTokensUsed(count).catch((err) => console.error("Failed to report token usage", err));
}
