import { useState } from "react";
import { View } from "react-native";
import { TabBar, type Tab } from "../components/TabBar";
import { DailyLessonScreen } from "./DailyLessonScreen";
import { ExploreScreen } from "./ExploreScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ReviewScreen } from "./ReviewScreen";

/** The signed-in app: four tabs under a bottom bar. Today stays mounted so a lesson in progress survives tab switches. */
export function MainScreen() {
  const [tab, setTab] = useState<Tab>("today");
  const [inLesson, setInLesson] = useState(false);
  const showTabBar = !(tab === "today" && inLesson);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, display: tab === "today" ? "flex" : "none" }}>
        <DailyLessonScreen onFlowChange={setInLesson} onOpenReview={() => setTab("review")} />
      </View>
      {tab === "explore" && <ExploreScreen />}
      {tab === "review" && <ReviewScreen />}
      {tab === "profile" && <ProfileScreen />}
      {showTabBar && <TabBar active={tab} onChange={setTab} />}
    </View>
  );
}
