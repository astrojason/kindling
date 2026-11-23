import { fetch as streamingFetch } from "expo/fetch";
import { streamChatWith } from "@random-knowledge/shared/chat-stream-reader";
import type { NoteMessage } from "@random-knowledge/shared/notes";
import { API_BASE_URL } from "./api";

/**
 * Streams one recall-coach turn from the site's /api/notes/chat as the signed-in user. React Native's own
 * fetch cannot stream a response, so this uses Expo's; see streamChatWith.
 */
export async function streamChat(args: {
  token: string;
  noteContext: { what_it_said: string; why_it_matters: string; application: string };
  messages: NoteMessage[];
  onText: (textSoFar: string) => void;
}): Promise<string> {
  if (!API_BASE_URL) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
  return streamChatWith(streamingFetch, API_BASE_URL, args);
}
