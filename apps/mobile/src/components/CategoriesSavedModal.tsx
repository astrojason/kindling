import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CATEGORIES, type CategoryKey } from "@random-knowledge/shared/categories";
import { radius, useTheme } from "../lib/theme";
import { Button } from "./ui";

/** Confirms a category save in front of everything, so it is seen wherever the user has scrolled to. */
export function CategoriesSavedModal({
  visible,
  categories,
  onClose,
}: {
  visible: boolean;
  categories: CategoryKey[];
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.fgStrong, fontSize: 18, fontWeight: "700" }}>Categories saved</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 13, marginTop: 6, marginBottom: 12 }}>
            Future lessons will come from these. Today’s lesson stays the same.
          </Text>
          <ScrollView style={styles.list}>
            {categories.map((key) => (
              <Text key={key} style={{ color: theme.fg, fontSize: 15, paddingVertical: 6 }} numberOfLines={1}>
                {CATEGORIES[key]}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.action}>
            <Button title="OK" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0, 0, 0, 0.4)" },
  dialog: { borderRadius: radius.md, borderWidth: 1, padding: 20, maxHeight: "70%" },
  list: { flexGrow: 0 },
  action: { marginTop: 16 },
});
