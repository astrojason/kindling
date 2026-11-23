import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CATEGORY_KEYS, type CategoryKey } from "@random-knowledge/shared/categories";
import { getSelectedCategories, setSelectedCategories } from "../../lib/firestore";
import { useTheme } from "../../lib/theme";
import { CategoryPicker } from "../CategoryPicker";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";

/** Which categories future lessons are drawn from. Someone who has never chosen starts with all of them. */
export function CategorySettings({ uid }: { uid: string }) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ categories?: CategoryKey[]; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSelectedCategories(uid)
      .then((categories) => {
        if (!cancelled) setLoaded({ categories: categories ?? CATEGORY_KEYS });
      })
      .catch((err) => {
        console.error("Failed to load the categories", err);
        if (!cancelled) setLoaded({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!loaded) return <LoadingView text="Loading your categories" />;
  if (loaded.error || !loaded.categories) return <ErrorBox message={loaded.error ?? "Could not load your categories."} />;

  return (
    <View>
      <CategoryPicker
        selectedCategories={loaded.categories}
        editing
        compact
        onSave={async (next) => {
          setSaved(false);
          await setSelectedCategories(uid, next);
          setSaved(true);
        }}
      />
      {saved && <Text accessibilityRole="alert" style={{ color: theme.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>Categories saved for future lessons.</Text>}
    </View>
  );
}
