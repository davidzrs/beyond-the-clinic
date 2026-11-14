// One JSON answer from Gemini, used by every Edge Function (moderation, sparks).
// No Deno- or Node-specific code here, so it also runs in the local check scripts.
//
// Gemini sometimes answers 503 "high demand" or 429 "rate limit". Then we wait a moment and retry,
// and if the main model is still down we fall back to a lighter one. Other errors fail right away.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-lite-latest'; // a different model, in case the main one is overloaded
const TIMEOUT_MS = 6000; // a slow answer counts as busy: retry instead of freezing the chat
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Ask = {
  system: string;            // the instructions
  prompt: string;            // this request
  schema: unknown;           // Gemini responseSchema: the shape of the JSON we want back
  temperature?: number;
  readToxic?: boolean;       // let Gemini read toxic text (moderation needs to see it to judge it)
};

// Returns the parsed JSON, or null when Google refused to answer at all (its own safety block).
export async function askJson<T>(ask: Ask, key: string, model = DEFAULT_MODEL): Promise<T | null> {
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const attempts = [model, model, FALLBACK_MODEL, FALLBACK_MODEL];
  let last: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await once<T>(ask, key, attempts[i]);
    } catch (e) {
      last = e;
      const timedOut = (e as any)?.name === 'TimeoutError';
      if (!(e instanceof Busy) && !timedOut) throw e;
      await sleep(400 * (i + 1));
    }
  }
  throw last;
}

class Busy extends Error {}

async function once<T>(ask: Ask, key: string, model: string): Promise<T | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: ask.system }] },
      contents: [{ role: 'user', parts: [{ text: ask.prompt }] }],
      generationConfig: { temperature: ask.temperature ?? 0, responseMimeType: 'application/json', responseSchema: ask.schema },
      ...(ask.readToxic ? {
        safetySettings: [
          'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
          'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT',
        ].map((category) => ({ category, threshold: 'BLOCK_NONE' })),
      } : {}),
    }),
  });
  if (res.status === 429 || res.status >= 500) throw new Busy(`Gemini ${model} ${res.status}`);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return out ? (JSON.parse(out) as T) : null;
}
