"use client";

import { AccessGate } from "@/components/AccessGate";
import { DiscoverFeed } from "@/components/discover/DiscoverFeed";
import { PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function DiscoverRoute() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame>{user && <DiscoverFeed uid={user.uid} getToken={() => user.getIdToken()} />}</PageFrame>
    </AccessGate>
  );
}
