"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { AccessGate } from "@/components/AccessGate";
import { DiscoverFeed } from "@/components/discover/DiscoverFeed";
import { SharedLessons } from "@/components/explore/SharedLessons";
import { LoadState, PAGE_BODY, PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { useExplore } from "@/lib/useExplore";

/** Explore: the user's own articles feed when they have an articles account, otherwise what other people shared. */
function Explore({ user }: { user: User }) {
  const explore = useExplore(user);
  return (
    <LoadState state={explore} notFound="Could not load Explore.">
      {({ hasArticles, shared }) =>
        hasArticles ? (
          <DiscoverFeed uid={user.uid} getToken={() => user.getIdToken()} />
        ) : shared.length > 0 ? (
          <SharedLessons shared={shared} />
        ) : (
          <p className="py-8 text-center text-sm text-fg-muted">
            Nothing to explore yet. Set your articles account in{" "}
            <Link href="/profile" className="font-bold text-accent underline underline-offset-2">Profile</Link>, or check back when someone shares a lesson.
          </p>
        )
      }
    </LoadState>
  );
}

export default function ExplorePage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame panels title="Explore">{user && <div className={PAGE_BODY}><Explore user={user} /></div>}</PageFrame>
    </AccessGate>
  );
}
