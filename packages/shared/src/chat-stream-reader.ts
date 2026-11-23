interface ChatChunk {
  error?: string;
  choices?: Array<{ delta?: { content?: string } }>;
}

/** The part of a streaming response body this needs, so the web's fetch and the mobile app's streaming fetch both fit. */
export interface ChunkReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
}

/**
 * Reads a /api/notes/chat server-sent-event stream to the end and returns the whole reply, calling `onText` with
 * the text so far. Nothing is swallowed: an error event from the server, a malformed chunk, or a connection that
 * drops before the stream finishes all throw with the reason.
 */
export async function readChatStream(reader: ChunkReader, onText: (textSoFar: string) => void): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) throw new Error("The chat stream ended unexpectedly before it finished.");
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return text;

      let chunk: ChatChunk;
      try {
        chunk = JSON.parse(payload);
      } catch {
        throw new Error(`Malformed chunk in the chat stream: ${payload.slice(0, 120)}`);
      }
      if (chunk.error) throw new Error(chunk.error);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        onText(text);
      }
    }
  }
}
