"use client";

import { ResetDataLink } from "@/components/profile/ResetDataLink";
import { CategorySettings } from "@/components/settings/CategorySettings";
import { DiscoverSettings } from "@/components/settings/DiscoverSettings";
import { PreReviewSetting } from "@/components/settings/PreReviewSetting";
import { PANEL } from "@/components/share/PageFrame";

/** The settings under the profile: pre-review and categories beside Discover from `lg`, then "Reset my data", centred. */
export function SettingsSections({ uid, onReset }: { uid: string; onReset: () => void }) {
  return (
    <section aria-labelledby="settings-heading" className="mt-8 border-t border-border pt-6 lg:mt-0 lg:flex lg:flex-1 lg:flex-col lg:pt-0">
      <h2 id="settings-heading" className="mb-2 font-heading text-xl font-bold text-fg-strong lg:sr-only">Settings</h2>
      <div className="lg:grid lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <div className={PANEL}>
          <PreReviewSetting uid={uid} />
          <CategorySettings uid={uid} />
        </div>
        <div className={`mt-6 lg:mt-0 ${PANEL}`}>
          <DiscoverSettings uid={uid} />
        </div>
      </div>
      <div className="mt-8 flex justify-center border-t border-border pt-6 lg:mt-0 lg:py-7">
        <ResetDataLink uid={uid} onReset={onReset} />
      </div>
    </section>
  );
}
