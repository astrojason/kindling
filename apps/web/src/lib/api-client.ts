import { ApiError, requestJsonFrom } from "@random-knowledge/shared/api-client";

export { ApiError };

/** Calls one of this app's API routes as the signed-in user; throws an ApiError with the server's message on a non-OK response. */
export function requestJson(path: string, token: string, init?: RequestInit) {
  return requestJsonFrom("", path, token, init);
}
