const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Asks the server to tell the admins that this signed-in person is waiting for access. The server announces
 * each request once and records on the request why it failed (shown on the admin's access page), so a failure
 * here is logged with its reason and not thrown: the person waiting cannot act on it.
 */
export async function notifyAdminsOfPending(getToken: () => Promise<string>): Promise<void> {
  try {
    if (!API_BASE_URL) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
    const res = await fetch(`${API_BASE_URL}/api/access/notify`, { method: "POST", headers: { Authorization: `Bearer ${await getToken()}` } });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("Could not tell the admins you are waiting for access", err);
  }
}
