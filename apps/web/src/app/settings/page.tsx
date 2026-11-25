"use client";

import { useState } from "react";
import { AccessGate } from "@/components/AccessGate";
import { ResetDataLink } from "@/components/profile/ResetDataLink";
import { CategorySettings } from "@/components/settings/CategorySettings";
import { DiscoverSettings } from "@/components/settings/DiscoverSettings";
import { PreReviewSetting } from "@/components/settings/PreReviewSetting";
import { PageFrame, PANEL } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  // After a reset every section reloads, so none shows data that is gone.
  const [resets, setResets] = useState(0);
  return (
    <AccessGate>
      <PageFrame panels title="Settings">
        <h1 className="mb-4 font-heading text-xl font-bold text-fg-strong lg:hidden">Settings</h1>
        {user && (
          <>
          <div key={resets} className="lg:grid lg:flex-1 lg:grid-cols-2 lg:items-stretch">
            <div className={PANEL}>
              <PreReviewSetting uid={user.uid} />
              <CategorySettings uid={user.uid} />
            </div>
            <div className={`mt-6 lg:mt-0 ${PANEL}`}>
              <DiscoverSettings uid={user.uid} />
            </div>
          </div>
          <div className="mt-8 flex justify-center border-t border-border pt-6 lg:mt-0 lg:py-7">
            <ResetDataLink uid={user.uid} onReset={() => setResets((n) => n + 1)} />
          </div>
          </>
        )}
      </PageFrame>
    </AccessGate>
  );
}
