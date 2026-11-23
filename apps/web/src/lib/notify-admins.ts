import { requestJson } from "@/lib/api-client";

/**
 * Asks the server to tell the admins that this signed-in person is waiting for access. The server announces
 * each request once and records on the request why it failed (shown on the admin's access page), so a failure
 * here is logged with its reason and not thrown: the person waiting cannot act on it.
 */
export async function notifyAdminsOfPending(getToken: () => Promise<string>): Promise<void> {
  try {
    await requestJson("/api/access/notify", await getToken(), { method: "POST" });
  } catch (err) {
    console.error("Could not tell the admins you are waiting for access", err);
  }
}
