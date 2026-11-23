import { useMemo } from "react";
import { Linking } from "react-native";
import Markdown from "react-native-markdown-display";
import { breakUpProse } from "@random-knowledge/shared/prose";
import { radius, useTheme } from "../../lib/theme";

/** A note field rendered as Markdown (never raw HTML; only http(s) links open), with one long paragraph broken into short ones. */
export function MarkdownBody({ children }: { children: string }) {
  const theme = useTheme();
  const styles = useMemo(
    () => ({
      body: { color: theme.fg, fontSize: 15, lineHeight: 22 },
      paragraph: { marginTop: 0, marginBottom: 10 },
      strong: { color: theme.accent, fontWeight: "700" as const },
      link: { color: theme.accent },
      code_inline: { color: theme.accent, backgroundColor: theme.accentSoft, borderRadius: radius.sm },
      code_block: { backgroundColor: theme.accentSoft, color: theme.fg, borderWidth: 0, borderRadius: radius.sm, padding: 10 },
      fence: { backgroundColor: theme.accentSoft, color: theme.fg, borderWidth: 0, borderRadius: radius.sm, padding: 10 },
      blockquote: { backgroundColor: "transparent", borderLeftColor: theme.accent, color: theme.fgMuted },
      hr: { backgroundColor: theme.border },
    }),
    [theme],
  );

  return (
    <Markdown
      style={styles}
      onLinkPress={(url) => {
        if (/^https?:\/\//i.test(url)) Linking.openURL(url).catch((err) => console.error(`Could not open ${url}`, err));
        return false;
      }}
    >
      {breakUpProse(children)}
    </Markdown>
  );
}
