"use client";

import { useState } from "react";
import { AccessGate } from "@/components/AccessGate";
import { ProfileFrame } from "@/components/profile/ProfileFrame";
import { ProfileView } from "@/components/profile/ProfileView";
import { SettingsSections } from "@/components/settings/SettingsSections";
import { useAuth } from "@/lib/auth-context";

/** Profile: level, streak and goal, with the settings underneath. A reset reloads all of it, so nothing shows data that is gone. */
function Profile({ uid }: { uid: string }) {
  const [resets, setResets] = useState(0);
  return (
    <div key={resets} className="lg:flex lg:flex-1 lg:flex-col">
      <ProfileView uid={uid} />
      <SettingsSections uid={uid} onReset={() => setResets((n) => n + 1)} />
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <ProfileFrame>{user && <Profile uid={user.uid} />}</ProfileFrame>
    </AccessGate>
  );
}
