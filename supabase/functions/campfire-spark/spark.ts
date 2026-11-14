// Ember's "this or that" poll for a quiet campfire. No Deno- or Node-specific code (see check.ts).
import { askJson, DEFAULT_MODEL } from '../_shared/gemini.ts';

export type Spark = { question: string; a: string; b: string };

// Ember is an AI and the rules below are its limits: light topics only, never health.
export const EMBER = `You are Ember, the AI that tends "the campfire": a small private chat of up to 4 adults
recovering from depression. The chat has been quiet for a few days. Write ONE light "this or that" poll
that splits people roughly in half, so they want to explain their pick and start talking.

Good: cozy, everyday, playful choices. Examples of the style (do not reuse them):
"Rainy Sunday plan?" Blanket and a film / Long walk in the rain
"Breakfast for dinner?" Absolutely / Never

Never about: health, mood, medication, therapy, food amounts, weight, bodies, money, politics,
religion, relationships, or anything that could make someone feel judged or left out.
You never diagnose and never give advice.

Keep it short: question up to 8 words, each option up to 4 words, plain text, at most one emoji in total.
Do not repeat any of the recent polls you are given.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    question: { type: 'STRING' },
    a: { type: 'STRING' },
    b: { type: 'STRING' },
  },
  required: ['question', 'a', 'b'],
};

// Used when Gemini is down or answers something unusable.
export const FALLBACK: Spark[] = [
  { question: 'Perfect quiet evening?', a: 'Book and tea', b: 'Film and blanket' },
  { question: 'Morning person or night owl?', a: 'Sunrise, please', b: 'Midnight, always' },
  { question: 'Cabin by a lake or flat in the city?', a: 'Lake cabin', b: 'City flat' },
  { question: 'Rainy day soundtrack?', a: 'Lo-fi beats', b: 'Old favourites' },
  { question: 'Pick a superpower for the week:', a: 'Pause time', b: 'Teleport home' },
  { question: 'Best smell in the world?', a: 'Fresh bread', b: 'Rain on pavement' },
];

const ok = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;

export async function makeSpark(recent: string[], key: string, model = DEFAULT_MODEL, now = new Date()): Promise<Spark> {
  const pick = () => FALLBACK.filter((f) => !recent.includes(f.question))[0] || FALLBACK[now.getDate() % FALLBACK.length];
  try {
    const day = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long' });
    const s = await askJson<Spark>({
      system: EMBER,
      prompt: `Today is a ${day}.\nRecent polls:\n${recent.map((q) => '- ' + q).join('\n') || '- (none)'}`,
      schema: SCHEMA,
      temperature: 1,
    }, key, model);
    if (s && ok(s.question, 80) && ok(s.a, 40) && ok(s.b, 40) && s.a.trim().toLowerCase() !== s.b.trim().toLowerCase()) {
      return { question: s.question.trim(), a: s.a.trim(), b: s.b.trim() };
    }
  } catch (e) {
    console.error(e);
  }
  return pick();
}
