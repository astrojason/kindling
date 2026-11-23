import OpenAI from "openai";

// Constructed lazily (not at module load) since OPENAI_API_KEY is only
// available at runtime, not during the build's page-data collection step.
let client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const NOTES_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
