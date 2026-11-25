"use client";

import { useParams } from "next/navigation";
import type { User } from "firebase/auth";
import { AccessGate } from "@/components/AccessGate";
import { LoadState, PAGE_BODY, PageFrame } from "@/components/share/PageFrame";
import { SavedLesson } from "@/components/share/SavedLesson";
import { requestJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDateLabel } from "@/lib/date";
import type { Lesson } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

/** A lesson made for another reader, opened from Explore: read-only, with its sources and links. */
function ExploreLessonView({ user, uid, lessonKey }: { user: User; uid: string; lessonKey: string }) {
  const state = useLoad(`explore-lesson-${uid}-${lessonKey}`, async () =>
    (await requestJson(`/api/explore/lessons/${encodeURIComponent(uid)}/${encodeURIComponent(lessonKey)}`, await user.getIdToken())) as Lesson);
  return (
    <LoadState state={state} notFound="That lesson doesn't exist.">
      {(lesson) => <SavedLesson lesson={lesson} byline={formatDateLabel(lessonKey.slice(0, 10))} actions={null} />}
    </LoadState>
  );
}

export default function ExploreLessonPage() {
  const { user } = useAuth();
  const { uid, key } = useParams<{ uid: string; key: string }>();
  return (
    <AccessGate>
      <PageFrame panels title="Explore">
        {user && <div className={PAGE_BODY}><ExploreLessonView user={user} uid={uid} lessonKey={decodeURIComponent(key)} /></div>}
      </PageFrame>
    </AccessGate>
  );
}
