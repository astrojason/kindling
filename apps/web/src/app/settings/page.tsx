"use client";

import { AccessGate } from "@/components/AccessGate";
import { CategorySettings } from "@/components/settings/CategorySettings";
import { DiscoverSettings } from "@/components/settings/DiscoverSettings";
import { PreReviewSetting } from "@/components/settings/PreReviewSetting";
import { PageFrame, PANEL } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame panels>
        <h1 className="mb-4 font-heading text-xl font-bold text-fg-strong lg:mb-6 lg:text-2xl">Settings</h1>
        {user && (
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <div className={PANEL}>
              <PreReviewSetting uid={user.uid} />
              <CategorySettings uid={user.uid} />
            </div>
            <div className={`mt-6 lg:mt-0 ${PANEL}`}>
              <DiscoverSettings uid={user.uid} />
            </div>
          </div>
        )}
      </PageFrame>
    </AccessGate>
  );
}
