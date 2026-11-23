"use client";

import { CronRunLog } from "@/components/admin/CronRunLog";
import { LogPage } from "@/components/admin/LogPage";
import { SuperadminOnly } from "@/components/admin/SuperadminOnly";
import { listCronRunLog } from "@/lib/firestore";

export default function CronLogPage() {
  return (
    <SuperadminOnly>
    <LogPage title="Cron run log" loadingText="Loading cron run log" fetchPage={listCronRunLog}>
      {(entries, requests) => <CronRunLog entries={entries} requests={requests} />}
    </LogPage>
    </SuperadminOnly>
  );
}
