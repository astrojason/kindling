import { NextResponse } from "next/server";

/** Returns an error response unless the request carries the CRON_SECRET bearer token Cloud Scheduler sends. */
export function authorizeCron(request: Request, job: string): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`CRON_SECRET is not configured; refusing to run ${job}.`);
    return NextResponse.json({ error: "Cron is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
