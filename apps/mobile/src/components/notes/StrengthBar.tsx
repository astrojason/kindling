import { View } from "react-native";
import { useTheme } from "../../lib/theme";

/** A 1-5 recall strength as five segments, filled up to the last self-rating. */
export function StrengthBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Strength ${value} of 5`} style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={{ height: 6, width: 20, borderRadius: 3, backgroundColor: n <= value ? theme.accent : theme.border }} />
      ))}
    </View>
  );
}
