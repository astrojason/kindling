/** Wall-clock milliseconds, kept out of components so event handlers can time things without tripping render-purity checks. */
export function nowMs(): number {
  return Date.now();
}
