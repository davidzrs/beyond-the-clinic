// Asks Gemini whether one chat message breaks the campfire rules.
// No Deno- or Node-specific code here, so the same file runs in the Edge Function and in check.ts.
import { askJson, DEFAULT_MODEL } from '../_shared/gemini.ts';

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

When unsure, allow it.

Separately, set crisis = true when the WRITER seems to be in danger right now: wanting to die,
thinking about suicide or hurting themselves, having a plan or the means, saying goodbye, or feeling
unable to stay safe. A clear joke about everyday annoyances ("one more meeting and I'm jumping in the
river lol") is not a crisis; plain sadness or a bad day is not a crisis either. When it reads as
sincere, choose crisis = true: a wrong alarm costs much less than a missed one.

Answer only with the JSON.`;

export type Verdict = { allowed: boolean; category: string; reason: string; crisis: boolean };

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    allowed: { type: 'BOOLEAN' },
    category: {
      type: 'STRING',
      enum: ['none', 'harassment', 'hate', 'sexual', 'threat', 'encouraging_self_harm', 'spam', 'personal_info'],
    },
    reason: { type: 'STRING', description: 'One short sentence, addressed to the sender, kind in tone.' },
    crisis: { type: 'BOOLEAN', description: 'The writer seems to be in danger themselves.' },
  },
  required: ['allowed', 'category', 'reason', 'crisis'],
};

export async function moderate(text: string, key: string, model = DEFAULT_MODEL): Promise<Verdict> {
  // Gemini's own filters would otherwise refuse to even read a toxic message, and we need its verdict.
  const v = await askJson<Verdict>({ system: RULES, prompt: `Message:\n"""${text}"""`, schema: SCHEMA, readToxic: true }, key, model);
  // No answer at all means Google blocked the prompt itself: treat that as a violation.
  return v ?? { allowed: false, category: 'blocked_by_provider', reason: 'This message can’t be shared at the campfire.', crisis: false };
}
