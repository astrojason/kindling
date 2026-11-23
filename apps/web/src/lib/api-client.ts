/** Calls one of this app's API routes as the signed-in user; throws the server's error message on a non-OK response. */
export async function requestJson(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body && { "Content-Type": "application/json" }) } });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
