import { requestJsonFrom } from "@random-knowledge/shared/api-client";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/** Calls one of the site's API routes as the signed-in user; throws the server's message on a non-OK response. */
export async function requestJson(path: string, token: string, init?: RequestInit) {
  if (!API_BASE_URL) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
  return requestJsonFrom(API_BASE_URL, path, token, init);
}
