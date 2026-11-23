"use client";

import { GenerationLog } from "@/components/admin/GenerationLog";
import { LogPage } from "@/components/admin/LogPage";
import { SuperadminOnly } from "@/components/admin/SuperadminOnly";
import { listGenerationLog } from "@/lib/firestore";

export default function GenerationLogPage() {
  return (
    <SuperadminOnly>
    <LogPage title="Generation log" loadingText="Loading generation log" fetchPage={listGenerationLog}>
      {(entries, requests) => <GenerationLog entries={entries} requests={requests} />}
    </LogPage>
    </SuperadminOnly>
  );
}
