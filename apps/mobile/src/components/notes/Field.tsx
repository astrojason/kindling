import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { radius, useTheme } from "../../lib/theme";

/** A labelled text input in the app's style. */
export function Field({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.accent }]}>
        {label.toUpperCase()}
        {hint ? <Text style={{ color: theme.fgMuted, fontWeight: "500" }}>  {hint}</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.fgMuted}
        style={[styles.input, { color: theme.fg, borderColor: theme.border, backgroundColor: theme.bg }, input.multiline && styles.multiline]}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
