import { StyleSheet, Text } from "react-native";
import { radius, useTheme } from "../lib/theme";

/** A full error message in a selectable block, so it can be copied. */
export function ErrorBox({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <Text selectable accessibilityRole="alert" style={[styles.box, { backgroundColor: theme.rustSoft, color: theme.rust }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({ box: { borderRadius: radius.sm, padding: 12, fontSize: 12, marginTop: 10 } });
