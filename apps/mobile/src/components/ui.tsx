import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useIsTablet } from "../lib/layout";
import { radius, useTheme } from "../lib/theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.accent : "transparent",
          borderColor: primary ? theme.accent : theme.border,
          opacity: disabled || pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? theme.accentFg : theme.fgMuted }]}>{title}</Text>
    </Pressable>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>{title}</Text>
    </Pressable>
  );
}

/** A card on a phone; on a tablet a flat, borderless panel on the page, like the desktop layout. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  const tablet = useIsTablet();
  return (
    <View style={[styles.card, tablet ? styles.flat : { backgroundColor: theme.surface, shadowColor: theme.accent }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    borderWidth: 2,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  flat: { borderRadius: 0, shadowOpacity: 0, paddingHorizontal: 24, paddingVertical: 12 },
  card: {
    borderRadius: radius.md,
    padding: 22,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
});
