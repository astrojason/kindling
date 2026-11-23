import { useState } from "react";
import { View } from "react-native";
import { TabBar, type Tab } from "../components/TabBar";
import { DailyLessonScreen } from "./DailyLessonScreen";
import { ExploreScreen } from "./ExploreScreen";
import { NotesScreen } from "./NotesScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ReviewScreen } from "./ReviewScreen";

/** The signed-in app: five tabs under a bottom bar. Today stays mounted so a lesson in progress survives tab switches. */
export function MainScreen() {
  const [tab, setTab] = useState<Tab>("today");
  const [inLesson, setInLesson] = useState(false);
  const [todayShown, setTodayShown] = useState(0);
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
  const showTabBar = !(tab === "today" && inLesson);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, display: tab === "today" ? "flex" : "none" }}>
        <DailyLessonScreen onFlowChange={setInLesson} refreshKey={todayShown} onOpenReview={() => changeTab("review")} onOpenNote={openNote} />
      </View>
      {tab === "explore" && <ExploreScreen />}
      {tab === "notes" && <NotesScreen key={openedNote?.nonce ?? 0} initialRoute={openedNote ? { name: "detail", id: openedNote.id } : undefined} />}
      {tab === "review" && <ReviewScreen onOpenNote={openNote} />}
      {tab === "profile" && <ProfileScreen />}
      {showTabBar && <TabBar active={tab} onChange={changeTab} />}
    </View>
  );
}
