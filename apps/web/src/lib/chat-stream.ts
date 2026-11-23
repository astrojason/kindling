import type { NoteMessage } from "@random-knowledge/shared/notes";
import { streamChatWith } from "@random-knowledge/shared/chat-stream-reader";

/** Streams one recall-coach turn from /api/notes/chat as the signed-in user; see streamChatWith. */
export function streamChat(args: {
  token: string;
  noteContext: { what_it_said: string; why_it_matters: string; application: string };
  messages: NoteMessage[];
  onText: (textSoFar: string) => void;
}): Promise<string> {
  return streamChatWith((url, init) => fetch(url, init), "", args);
}
