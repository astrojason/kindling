const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushTicket {
  status: "ok" | "error";
  message?: string;
}

/**
 * Sends a badge-only push through Expo's push service, so the mobile app's icon
 * badge shows how many things await (lesson plus due reviews) without the app being
 * open. No title/body/sound is set, so it never shows an alert or plays a sound. It is
 * deliberately not a content-available (background) push: iOS ignores the badge on those.
 */
export async function sendBadgePush(expoPushToken: string, badge: number): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify([{ to: expoPushToken, badge, priority: "high" }]),
  });
  if (!res.ok) throw new Error(`Expo push request failed: ${res.status} ${await res.text()}`);

  const body = (await res.json()) as { data?: ExpoPushTicket[] };
  const ticket = body.data?.[0];
  if (ticket?.status === "error") throw new Error(`Expo push ticket error: ${ticket.message ?? "unknown"}`);
}

/**
 * Sends a visible alert (with sound) to each device through Expo's push service. Returns how many Expo
 * accepted and one line per token it refused (for example a stale device); throws only when the whole request fails.
 */
export async function sendAlertPush(tokens: string[], { title, body, url }: { title: string; body: string; url: string }): Promise<{ sent: number; failures: string[] }> {
  if (tokens.length === 0) return { sent: 0, failures: [] };

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default", priority: "high", data: { url } }))),
  });
  if (!res.ok) throw new Error(`Expo push request failed: ${res.status} ${await res.text()}`);

  const { data = [] } = (await res.json()) as { data?: ExpoPushTicket[] };
  const failures = data.flatMap((ticket, i) => (ticket.status === "error" ? [`${tokens[i]}: ${ticket.message ?? "unknown error"}`] : []));
  return { sent: tokens.length - failures.length, failures };
}
