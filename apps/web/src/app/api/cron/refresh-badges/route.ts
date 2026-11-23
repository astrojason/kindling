import { NextResponse } from "next/server";
import { refreshBadge } from "@/lib/badge-push";
import { authorizeCron } from "@/lib/cron-auth";
import { todayStr } from "@/lib/date";
import { listGrantedUserIds, listPrivilegedUserIds } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// The server has no per-user timezone; lessons and review dates follow the owner's Pacific day.
const TIME_ZONE = "America/Los_Angeles";

/**
 * Hourly: sets every registered phone's icon badge to what awaits it (today's lesson plus due cards and
 * notes). Reviews fall due through the day, not just at the nightly lesson run, so the badge follows them.
 * Nothing is generated here.
 */
export async function POST(request: Request) {
  const denied = authorizeCron(request, "the badge refresh");
  if (denied) return denied;

  const date = todayStr(TIME_ZONE);
  const uids = [...new Set([...(await listGrantedUserIds()), ...(await listPrivilegedUserIds())])];
  const failures: string[] = [];
  await Promise.all(uids.map(async (uid) => {
    try {
      await refreshBadge(uid, date);
    } catch (err) {
      console.error(`Failed to refresh the badge for ${uid}`, err);
      failures.push(`${uid}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }));

  return NextResponse.json({ date, users: uids.length, failures }, { status: failures.length ? 502 : 200 });
}
