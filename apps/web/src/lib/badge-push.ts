import { getBadgeCountAdmin, getPushTokenAdmin } from "@/lib/firebase-admin";
import { sendBadgePush } from "@/lib/push";

/** Sets the app icon badge on this user's registered phone (if any) to what awaits them. Throws if the lookup or push fails. */
export async function refreshBadge(uid: string, date: string): Promise<void> {
  const pushToken = await getPushTokenAdmin(uid);
  if (!pushToken) return;
  await sendBadgePush(pushToken.token, await getBadgeCountAdmin(uid, date));
}
