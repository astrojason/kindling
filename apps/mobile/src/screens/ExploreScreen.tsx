import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { DiscoverFeed } from "../components/discover/DiscoverFeed";
import { ErrorBox } from "../components/ErrorBox";
import { PastLessons } from "../components/explore/PastLessons";
import { LoadingView } from "../components/LoadingView";
import { requestJson } from "../lib/api";
import { useAuth } from "../lib/auth-context";

/**
 * Explore: the user's own articles feed when they have an articles account (asked of the server, as on the web),
 * otherwise their past lessons. Asked again each time the tab opens, so a newly saved account shows at once.
 */
export function ExploreScreen({ onOpenNote }: { onOpenNote: (noteId: string, notice: string) => void }) {
  const { user } = useAuth();
  const [explore, setExplore] = useState<{ hasArticles?: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) => requestJson("/api/explore", token) as Promise<{ hasArticles: boolean }>)
      .then((data) => {
        if (!cancelled) setExplore({ hasArticles: data.hasArticles });
      })
      .catch((err) => {
        console.error("Failed to check for an articles account", err);
        if (!cancelled) setExplore({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  if (!explore) return <LoadingView text="Loading Explore" />;
  if (explore.hasArticles) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <DiscoverFeed uid={user.uid} getToken={() => user.getIdToken()} onSaved={onOpenNote} />
      </ScrollView>
    );
  }
  if (explore.error) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorBox message={`Could not check for your articles account: ${explore.error}`} />
      </ScrollView>
    );
  }
  return <PastLessons />;
}

const styles = StyleSheet.create({ scroll: { padding: 16, paddingBottom: 32 } });
