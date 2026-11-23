/** A non-OK response from one of this app's API routes: the server's message, plus its status and whole body. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Calls one of this app's API routes as the signed-in user; throws an ApiError with the server's message on a non-OK response. */
export async function requestJson(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.body && { "Content-Type": "application/json" }) } });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data);
  return data;
}
