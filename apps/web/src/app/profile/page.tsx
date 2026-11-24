"use client";

import { AccessGate } from "@/components/AccessGate";
import { ProfileView } from "@/components/profile/ProfileView";
import { PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame panels>{user && <ProfileView uid={user.uid} />}</PageFrame>
    </AccessGate>
  );
}
