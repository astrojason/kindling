import type { NoteMessage } from "@random-knowledge/shared/notes";
import { readChatStream } from "@random-knowledge/shared/chat-stream-reader";

/**
 * Streams one recall-coach turn from /api/notes/chat as the signed-in user and returns the whole reply, calling
 * `onText` with the text so far. A non-OK response throws the server's message; see readChatStream for the rest.
 */
export async function streamChat({
  token,
  noteContext,
  messages,
  onText,
}: {
  token: string;
  noteContext: { what_it_said: string; why_it_matters: string; application: string };
  messages: NoteMessage[];
  onText: (textSoFar: string) => void;
}): Promise<string> {
  const res = await fetch("/api/notes/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ noteContext, messages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("The chat response had no response body.");
  return readChatStream(res.body.getReader(), onText);
}
