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

/** A lesson made for another reader, opened from Explore by its opaque id: read-only, with its sources and links. */
function ExploreLessonView({ user, id }: { user: User; id: string }) {
  const state = useLoad(`explore-lesson-${id}`, async () =>
    (await requestJson(`/api/explore/lessons/${encodeURIComponent(id)}`, await user.getIdToken())) as { date: string; lesson: Lesson });
  return (
    <LoadState state={state} notFound="That lesson doesn't exist.">
      {({ date, lesson }) => <SavedLesson lesson={lesson} byline={formatDateLabel(date)} actions={null} />}
    </LoadState>
  );
}

export default function ExploreLessonPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  return (
    <AccessGate>
      <PageFrame panels title="Explore">{user && <div className={PAGE_BODY}><ExploreLessonView user={user} id={id} /></div>}</PageFrame>
    </AccessGate>
  );
}
