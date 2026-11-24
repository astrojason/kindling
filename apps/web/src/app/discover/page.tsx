"use client";

import { AccessGate } from "@/components/AccessGate";
import { DiscoverFeed } from "@/components/discover/DiscoverFeed";
import { PAGE_BODY, PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function DiscoverRoute() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame panels title="Discover">{user && <div className={PAGE_BODY}><DiscoverFeed uid={user.uid} getToken={() => user.getIdToken()} /></div>}</PageFrame>
    </AccessGate>
  );
}
