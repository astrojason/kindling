import { useColorScheme } from "react-native";

// Mirrors apps/web/src/theme.css (the "Brightly" look), following the OS appearance.
const palettes = {
  light: {
    bg: "#f5f2ff",
    surface: "#ffffff",
    surfaceRaised: "#faf8ff",
    border: "#e5e0f7",
    fg: "#2d2754",
    fgStrong: "#1c1640",
    fgMuted: "#7c76a0",
    accent: "#5b45d6",
    accentFg: "#ffffff",
    accentSoft: "rgba(91, 69, 214, 0.1)",
    rust: "#d63f68",
    rustFg: "#ffffff",
    rustSoft: "rgba(214, 63, 104, 0.1)",
    correct: "rgba(34, 160, 107, 0.14)",
    incorrect: "rgba(214, 63, 104, 0.1)",
    success: "#1f9d68",
    gold: "#e0a21b",
    heroFrom: "#7d68ee",
    heroTo: "#4a33c0",
    heroFg: "#ffffff",
    blueprint: "#0d1017",
    blueprintLine: "rgba(255, 255, 255, 0.08)",
    blueprintFg: "#f2f4f8",
    blueprintMuted: "#a8afbf",
    blueprintTag: "#b3261e",
  },
  dark: {
    bg: "#14112b",
    surface: "#1f1b3d",
    surfaceRaised: "#272250",
    border: "#35305f",
    fg: "#e3def8",
    fgStrong: "#f6f3ff",
    fgMuted: "#9d98c4",
    accent: "#a898ff",
    accentFg: "#19133a",
    accentSoft: "rgba(168, 152, 255, 0.16)",
    rust: "#ff7d9f",
    rustFg: "#2d0b16",
    rustSoft: "rgba(255, 125, 159, 0.16)",
    correct: "rgba(80, 210, 150, 0.18)",
    incorrect: "rgba(255, 125, 159, 0.16)",
    success: "#54d29b",
    gold: "#ffc857",
    heroFrom: "#5a45d6",
    heroTo: "#3a2894",
    heroFg: "#ffffff",
    blueprint: "#0d1017",
    blueprintLine: "rgba(255, 255, 255, 0.08)",
    blueprintFg: "#f2f4f8",
    blueprintMuted: "#a8afbf",
    blueprintTag: "#b3261e",
  },
} as const satisfies Record<"light" | "dark", Record<string, string>>;

export type Palette = Record<keyof typeof palettes.light, string>;

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return palettes[scheme === "dark" ? "dark" : "light"];
}

/** Shared corner radii, matching the web theme's rounded cards and pills. */
export const radius = { sm: 14, md: 24, lg: 32, pill: 999 } as const;
