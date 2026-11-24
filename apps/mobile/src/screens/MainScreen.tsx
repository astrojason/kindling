import { useState } from "react";
import { View } from "react-native";
import { SideNav } from "../components/SideNav";
import { TabBar, type Tab } from "../components/TabBar";
import { CONTENT_MAX_WIDTH, READING_MAX_WIDTH, useIsTablet } from "../lib/layout";
import { DailyLessonScreen } from "./DailyLessonScreen";
import { ExploreScreen } from "./ExploreScreen";
import { NotesScreen } from "./NotesScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ReviewScreen } from "./ReviewScreen";

/** The signed-in app: five tabs under a bottom bar (a side navigation column on a tablet). Today stays mounted so a lesson in progress survives tab switches. */
export function MainScreen() {
  const [tab, setTab] = useState<Tab>("today");
  const [inLesson, setInLesson] = useState(false);
  const [todayShown, setTodayShown] = useState(0);
  // Bumped after a data reset so Today remounts and loads from the now-empty account instead of keeping stale state.
  const [todayResets, setTodayResets] = useState(0);
  // A note opened from Today or Review: the Notes tab starts on that note, and remounts (new nonce) for each one.
  const [openedNote, setOpenedNote] = useState<{ id: string; nonce: number } | null>(null);

  function changeTab(next: Tab) {
    if (next === "today" && tab !== "today") setTodayShown((n) => n + 1);
    setOpenedNote(null);
    setTab(next);
  }

  function openNote(id: string) {
    setOpenedNote({ id, nonce: Date.now() });
    setTab("notes");
  }
  const reading = tab === "today" && inLesson;
  const showTabBar = !reading;
  const tablet = useIsTablet();

  const pages = (
    <>
      <View style={{ flex: 1, display: tab === "today" ? "flex" : "none" }}>
        <DailyLessonScreen key={todayResets} onFlowChange={setInLesson} refreshKey={todayShown} onOpenReview={() => changeTab("review")} onOpenNote={openNote} />
      </View>
      {tab === "explore" && <ExploreScreen />}
      {tab === "notes" && <NotesScreen key={openedNote?.nonce ?? 0} initialRoute={openedNote ? { name: "detail", id: openedNote.id } : undefined} />}
      {tab === "review" && <ReviewScreen onOpenNote={openNote} />}
      {tab === "profile" && <ProfileScreen onDataReset={() => setTodayResets((n) => n + 1)} />}
    </>
  );

  if (tablet) {
    return (
      <View style={{ flex: 1, flexDirection: "row" }}>
        {showTabBar && <SideNav active={tab} onChange={changeTab} />}
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ flex: 1, width: "100%", maxWidth: reading ? READING_MAX_WIDTH : CONTENT_MAX_WIDTH }}>{pages}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {pages}
      {showTabBar && <TabBar active={tab} onChange={changeTab} />}
    </View>
  );
}
