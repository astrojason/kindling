import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { getNoteSettingsAdmin } from "@/lib/firebase-admin";
import { ArticleNotFoundError } from "./turso";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Signs the request in and loads the Discover settings from the user's own users/{uid} doc. The articles
 * account and keywords always come from there, never from the request, so one user cannot read or change
 * another's articles by passing a different uid.
 */
export async function authorizeDiscover(request: Request): Promise<NextResponse | { uid: string; articlesAppUid: string; interestKeywords: string[] }> {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;

  let settings;
  try {
    settings = await getNoteSettingsAdmin(authorized.uid);
  } catch (err) {
    console.error("Discover: could not read the user's settings", err);
    return NextResponse.json({ error: `Could not read your settings: ${message(err)}` }, { status: 502 });
  }
  if (!settings.articlesAppUid) return NextResponse.json({ error: "Set your articles account in Settings before using Discover." }, { status: 400 });
  return { uid: authorized.uid, articlesAppUid: settings.articlesAppUid, interestKeywords: settings.interestKeywords };
}

/** A positive whole number from a JSON body field, or null. */
export function parseArticleId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Maps a failure from the articles database to a response that carries its real message. */
export function discoverFailure(err: unknown, action: string): NextResponse {
  if (err instanceof ArticleNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
  console.error(`Discover: ${action} failed`, err);
  return NextResponse.json({ error: message(err) }, { status: 502 });
}
