import type { GameKind, Lesson, LessonGames, MatchPair, TrueFalseStatement } from "./types";

export type Game =
  | { kind: "pairs"; pairs: MatchPair[] }
  | { kind: "order"; prompt: string; items: string[] }
  | { kind: "trueFalse"; statements: TrueFalseStatement[] };

const KINDS: GameKind[] = ["pairs", "order", "trueFalse"];

function available(games: LessonGames): GameKind[] {
  return KINDS.filter((kind) => (kind === "order" ? !!games.order : !!games[kind]?.length));
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The mini-game for a lesson: one of the games it has, chosen by its date. Null when the lesson has no game data. */
export function gameFor(lesson: Lesson, date: string): Game | null {
  const games = lesson.games;
  if (!games) return null;
  const kinds = available(games);
  if (!kinds.length) return null;
  const day = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const kind = kinds[day % kinds.length];
  if (kind === "pairs") return { kind, pairs: games.pairs! };
  if (kind === "order") return { kind, prompt: games.order!.prompt, items: games.order!.items };
  return { kind, statements: games.trueFalse! };
}

/** A repeatable shuffle (same seed, same order) so a game does not rearrange itself on every render. */
export function shuffleSeeded<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let state = hash(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isOrderCorrect(picked: string[], correct: string[]): boolean {
  return picked.length === correct.length && picked.every((item, i) => item === correct[i]);
}
