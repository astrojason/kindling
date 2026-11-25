"use client";

import { ResetDataLink } from "@/components/profile/ResetDataLink";
import { CategorySettings } from "@/components/settings/CategorySettings";
import { DiscoverSettings } from "@/components/settings/DiscoverSettings";
import { PreReviewSetting } from "@/components/settings/PreReviewSetting";
import { PANEL } from "@/components/share/PageFrame";

/** The settings under the profile: pre-review beside Discover from `lg`, every category across the page below, then "Reset my data", centred. */
export function SettingsSections({ uid, onReset }: { uid: string; onReset: () => void }) {
  return (
    <section aria-labelledby="settings-heading" className="mt-8 border-t border-border pt-6 lg:mt-0 lg:flex lg:flex-1 lg:flex-col lg:pt-0">
      <h2 id="settings-heading" className="mb-2 font-heading text-xl font-bold text-fg-strong lg:sr-only">Settings</h2>
      <div className="lg:grid lg:grid-cols-2 lg:items-stretch lg:border-b lg:border-border">
        <div className={PANEL}>
          <PreReviewSetting uid={uid} />
        </div>
        <div className={`mt-6 lg:mt-0 ${PANEL}`}>
          <DiscoverSettings uid={uid} />
        </div>
      </div>
      <div className="lg:flex-1 lg:px-12 lg:pb-7">
        <CategorySettings uid={uid} />
      </div>
      <div className="mt-8 flex justify-center border-t border-border pt-6 lg:mt-0 lg:py-7">
        <ResetDataLink uid={uid} onReset={onReset} />
      </div>
    </section>
  );
}
