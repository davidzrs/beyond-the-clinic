// Try Ember's polls locally:  node --env-file=supabase/functions/.env supabase/functions/campfire-spark/check.ts
import { makeSpark } from './spark.ts';

const key = process.env.GEMINI_API_KEY || '';
if (!key) { console.error('Set GEMINI_API_KEY (see send-message/check.ts).'); process.exit(1); }
const recent: string[] = [];
for (let i = 0; i < 5; i++) {
  const s = await makeSpark(recent, key, process.env.GEMINI_MODEL || undefined);
  recent.push(s.question);
  console.log(`${s.question}   [ ${s.a} | ${s.b} ]`);
  await new Promise((r) => setTimeout(r, 4000));
}
