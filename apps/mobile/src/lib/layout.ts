import { useWindowDimensions } from "react-native";

/** At or above this width the app uses its tablet layout (an iPad in portrait is 744pt or more; no iPhone reaches it). */
export const TABLET_MIN_WIDTH = 700;

/** Content is capped to these widths on a tablet so lines stay readable. */
export const CONTENT_MAX_WIDTH = 1100;
export const READING_MAX_WIDTH = 720;

export function useIsTablet(): boolean {
  return useWindowDimensions().width >= TABLET_MIN_WIDTH;
}
