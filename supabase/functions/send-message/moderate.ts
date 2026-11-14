// Asks Gemini whether one chat message breaks the campfire rules.
// No Deno- or Node-specific code here, so the same file runs in the Edge Function and in check.ts.

// The rules. Written for a peer-support group of people recovering from depression:
// sadness and venting are what the chat is for, so they must never count as a violation.
export const RULES = `You moderate "the campfire": a small private chat of up to 4 adults recovering from depression,
who support each other between therapy sessions. Decide if ONE message breaks the rules.

Violations (allowed = false):
- harassment: insulting, mocking, belittling or bullying another member
- hate: attacks on identity (race, religion, gender, sexuality, disability, etc.)
- sexual: sexual content or advances
- threat: threatening or wishing harm on someone else
- encouraging_self_harm: telling or pushing SOMEONE ELSE to hurt or kill themselves, or sharing methods
- spam: advertising, links to sell things, scams, repeated junk
- personal_info: sharing SOMEONE ELSE's address, phone number or other private details

These count in any language, and also when disguised with numbers, symbols or misspellings
("p4thetic", "k!ll yourself"): judge what the message means, not how it is spelled.

NOT violations (allowed = true), even if the message is dark:
- talking about your OWN sadness, hopelessness, bad days, anger or pain
- mild swearing that is not aimed at a person ("this week was shit")
- dark humour about YOURSELF ("one more meeting and I'm jumping in the river")
- playful teasing or swearing between friends, when the tone is clearly friendly (emoji, banter)
- sharing your OWN phone number, social handle or similar so others can reach you
- disagreeing politely, short or odd messages

When unsure, allow it. Answer only with the JSON.`;

export type Verdict = { allowed: boolean; category: string; reason: string };

// Gemini sometimes answers 503 "high demand" or 429 "rate limit". Then we wait a moment and retry,
// and if the main model is still down we fall back to a lighter one. Other errors fail right away.
const FALLBACK_MODEL = 'gemini-flash-lite-latest'; // a different model, in case the main one is overloaded
const TIMEOUT_MS = 6000; // a slow answer counts as busy: retry instead of freezing the chat
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function moderate(text: string, key: string, model = 'gemini-3.5-flash-lite'): Promise<Verdict> {
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const attempts = [model, model, FALLBACK_MODEL, FALLBACK_MODEL];
  let last: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await askGemini(text, key, attempts[i]);
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

async function askGemini(text: string, key: string, model: string): Promise<Verdict> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES }] },
      contents: [{ role: 'user', parts: [{ text: `Message:\n"""${text}"""` }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            allowed: { type: 'BOOLEAN' },
            category: {
              type: 'STRING',
              enum: ['none', 'harassment', 'hate', 'sexual', 'threat', 'encouraging_self_harm', 'spam', 'personal_info'],
            },
            reason: { type: 'STRING', description: 'One short sentence, addressed to the sender, kind in tone.' },
          },
          required: ['allowed', 'category', 'reason'],
        },
      },
      // Gemini's own filters would otherwise refuse to even read a toxic message, and we need its verdict.
      safetySettings: [
        'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT',
      ].map((category) => ({ category, threshold: 'BLOCK_NONE' })),
    }),
  });
  if (res.status === 429 || res.status >= 500) throw new Busy(`Gemini ${model} ${res.status}`);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  // No answer at all means Google blocked the prompt itself: treat that as a violation.
  if (!out) return { allowed: false, category: 'blocked_by_provider', reason: 'This message can’t be shared at the campfire.' };
  return JSON.parse(out) as Verdict;
}
