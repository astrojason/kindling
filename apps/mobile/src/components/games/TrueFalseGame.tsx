import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TrueFalseStatement } from "@random-knowledge/shared/types";
import { radius, useTheme } from "../../lib/theme";
import { Button } from "../ui";

/** Judge each statement true or false; the answer shows right away and wrong answers count as misses. */
export function TrueFalseGame({ statements, onFinish }: { statements: TrueFalseStatement[]; onFinish: (misses: number) => void }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [misses, setMisses] = useState(0);
  const current = statements[index];
  const answered = answer !== null;
  const right = answered && answer === current.isTrue;

  function choose(value: boolean) {
    setAnswer(value);
    if (value !== current.isTrue) setMisses(misses + 1);
  }

  function next() {
    if (index + 1 < statements.length) {
      setIndex(index + 1);
      setAnswer(null);
    } else {
      onFinish(misses);
    }
  }

  return (
    <View>
      <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>Statement {index + 1} of {statements.length}</Text>
      <Text style={{ color: theme.fgStrong, fontSize: 18, fontWeight: "800", marginBottom: 14 }}>{current.statement}</Text>
      <View style={styles.row}>
        {[true, false].map((value) => (
          <View key={String(value)} style={styles.flex}>
            <Button title={value ? "True" : "False"} variant="secondary" disabled={answered} onPress={() => choose(value)} />
          </View>
        ))}
      </View>
      {answered && (
        <>
          <Text accessibilityRole="alert" style={{ color: right ? theme.success : theme.rust, fontSize: 14, fontWeight: "700", marginVertical: 12, borderRadius: radius.sm }}>
            {right ? "Correct" : `Not quite — that statement is ${current.isTrue ? "true" : "false"}.`}
          </Text>
          <Button title={index + 1 < statements.length ? "Next" : "Finish"} onPress={next} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 12 }, flex: { flex: 1 } });
