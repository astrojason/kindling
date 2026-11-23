/**
 * The web link a tapped push notification may open: only an /admin path, on the app's own site. The `url`
 * rides in the push payload, so anything else (another host, a scheme, a path with `..`) is refused.
 */
export function adminLinkFromNotification(data: Record<string, unknown> | null | undefined, baseUrl: string | undefined): string | null {
  const url = data?.url;
  if (typeof url !== "string" || !baseUrl) return null;
  if (!/^\/admin(\/[A-Za-z0-9._~-]+)*$/.test(url) || url.split("/").includes("..")) return null;
  return `${baseUrl.replace(/\/+$/, "")}${url}`;
}
