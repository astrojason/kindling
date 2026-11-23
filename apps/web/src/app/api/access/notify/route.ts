import { NextResponse } from "next/server";
import { authorizeSignedIn } from "@/lib/api-auth";
import { claimAccessNotificationAdmin, getPushTokenAdmin, listPrivilegedUserIds, releaseAccessNotificationAdmin } from "@/lib/firebase-admin";
import { sendAlertPush } from "@/lib/push";

export const dynamic = "force-dynamic";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Called by a signed-in user whose access is still pending (the apps call it whenever they see that): tells
 * every admin and superadmin device that someone is waiting. Safe to call repeatedly: the request is stamped
 * once announced, and the stamp is released (with the reason on the request) when no device could be told, so
 * the next call retries.
 */
export async function POST(request: Request) {
  const authorized = await authorizeSignedIn(request);
  if (authorized instanceof NextResponse) return authorized;
  const { uid } = authorized;

  const who = await claimAccessNotificationAdmin(uid);
  if (!who) return NextResponse.json({ notified: 0, skipped: true });

  /** Undoes the stamp so the next call retries, and returns the reason; a failure to even do that is added to it, not hidden. */
  async function release(reason: string): Promise<string> {
    try {
      await releaseAccessNotificationAdmin(uid, reason);
      return reason;
    } catch (err) {
      console.error("Failed to release the access notification stamp", err);
      return `${reason} (and the retry marker could not be set: ${message(err)})`;
    }
  }

  try {
    const admins = await listPrivilegedUserIds();
    const tokens = (await Promise.all(admins.map((adminUid) => getPushTokenAdmin(adminUid)))).flatMap((t) => (t ? [t.token] : []));
    if (tokens.length === 0) {
      const reason = "No admin device is registered for push notifications yet.";
      return NextResponse.json({ notified: 0, failures: [await release(reason)] });
    }

    const result = await sendAlertPush(tokens, { title: "Someone is waiting for access", body: `${who.displayName ?? who.email ?? "A new user"} wants to join Kindling.`, url: "/admin/access" });
    if (result.sent === 0) return NextResponse.json({ error: await release(`No device could be notified: ${result.failures.join("; ")}`) }, { status: 502 });
    return NextResponse.json({ notified: result.sent, failures: result.failures });
  } catch (err) {
    console.error("Failed to notify admins of a pending access request", err);
    return NextResponse.json({ error: await release(`Could not send the push: ${message(err)}`) }, { status: 502 });
  }
}
