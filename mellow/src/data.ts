import { Avatar } from './pixel/sprites';

export const ME_DEFAULT: Avatar = { name: 'Sam', color: 'vanilla', face: 'content', hat: 'beanie', glasses: 'none', acc: 'scarf', item: 'mug' };

// Accounts that never customised their marshmallow get their own look, worked out from their account id,
// so everyone looks different at the fire and the same person always looks the same on every device.
// A look someone picked in the wardrobe is saved to their profile and always wins over this.
const LOOK = {
  color: ['vanilla', 'strawberry', 'mint', 'lavender', 'toasted', 'blueberry'],
  face: ['content', 'happy', 'calm', 'wink', 'excited'],
  hat: ['none', 'beanie', 'cap', 'sprout', 'bucket', 'crown', 'none', 'beanie'],
  glasses: ['none', 'none', 'none', 'round', 'sunnies', 'hearts'],
  acc: ['none', 'scarf', 'bow', 'bowtie', 'flower', 'scarf'],
  item: ['none', 'mug', 'lantern', 'book', 'plant', 'mug'],
};
export function lookFor(id: string): Omit<Avatar, 'name'> {
  let h = 2166136261; // FNV-1a hash of the id
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const pick = <T,>(list: T[], salt: number) => list[(((h ^ Math.imul(salt, 0x9e3779b1)) >>> 0) % 997) % list.length];
  return { color: pick(LOOK.color, 1), face: pick(LOOK.face, 2), hat: pick(LOOK.hat, 3), glasses: pick(LOOK.glasses, 4), acc: pick(LOOK.acc, 5), item: pick(LOOK.item, 6) };
}
// A profile's marshmallow: its own look on top of the one worked out from its id.
export function profileLook(id: string, saved: Partial<Avatar> | null | undefined, name: string): Avatar {
  return { ...ME_DEFAULT, ...lookFor(id), ...(saved || {}), name };
}

export type Member = { id: string; name: string; since?: string; likes?: string; a: Avatar };
export const MEMBERS: Member[] = [
  { id: 'juno', name: 'Juno', since: 'Oct 4', likes: 'Rainy-day jazz, crosswords', a: { name: 'Juno', color: 'lavender', face: 'happy', hat: 'sprout', glasses: 'round', acc: 'none', item: 'book' } },
  { id: 'teo', name: 'Teo', since: 'Oct 4', likes: 'Trail walks, baking sourdough', a: { name: 'Teo', color: 'toasted', face: 'content', hat: 'cap', glasses: 'none', acc: 'bowtie', item: 'lantern' } },
  { id: 'me', name: 'You', a: ME_DEFAULT },
  { id: 'ama', name: 'Ama', since: 'Oct 9', likes: 'Film photography, green tea', a: { name: 'Ama', color: 'strawberry', face: 'calm', hat: 'none', glasses: 'hearts', acc: 'flower', item: 'mug' } },
];

// kind 'spark': a poll from Ember, the campfire's AI (from = 'ember'), with two options.
export type Msg = { id: number; from: string; text: string; time: string; kind?: 'text' | 'spark'; poll?: { a: string; b: string } };
export const CHAT0: Msg[] = [
  { id: 1, from: 'juno', text: 'Got today’s Ember Words in 4 tries. Sneaky one.', time: '18:42' },
  { id: 2, from: 'teo', text: 'Short walk before work this morning. Cold, but the sky was pink.', time: '18:55' },
  { id: 3, from: 'ama', text: 'Anyone watching something cozy? I need a new show for this week.', time: '19:10' },
  { id: 4, from: 'juno', text: 'Anything by Studio Ghibli. Always.', time: '19:12' },
];
export const REPLIES = ['That sounds really nice.', 'Thanks for sharing that.', 'Same here, honestly.', 'Love that. Tell us more on Sunday?', 'Sending a wave your way.', 'Ha, I needed that today.', 'That counts. Small things count.'];

export type MoodKey = 'heavy' | 'low' | 'okay' | 'good' | 'bright';
export const MOOD_KEYS: MoodKey[] = ['heavy', 'low', 'okay', 'good', 'bright'];
export const MOODS: Record<MoodKey, { label: string; face: string; reply: string; sug?: { label: string; act: string }; support?: boolean }> = {
  heavy: { label: 'Heavy', face: 'heavy', reply: 'Thanks for telling us. Heavy days happen, and checking in still counts.', sug: { label: 'Breathe with the flame (3 min)', act: 'breathe' }, support: true },
  low: { label: 'Low', face: 'tired', reply: 'Noted, gently. Something small might help, like a few minutes of daylight or a warm drink.', sug: { label: 'Take a Sky Break (5 min)', act: 'sky' } },
  okay: { label: 'Okay', face: 'okay', reply: 'Okay is a fine place to be. Today’s quests are light ones.' },
  good: { label: 'Good', face: 'content', reply: 'Nice. Want to share a little of that with your campfire?', sug: { label: 'Say hi at the fire', act: 'campfire' } },
  bright: { label: 'Bright', face: 'happy', reply: 'Love that. Maybe note what helped today, so future you can find it again.' },
};

export type Quest = { id: string; icon: string; title: string; dur: string; why: string; ember: number; act?: string };
export const QUEST_POOL: Quest[] = [
  { id: 'sky', icon: 'sky', title: 'Look at the sky for 5 minutes', dur: '5 min', why: 'Daylight helps your sleep rhythm settle.', ember: 3 },
  { id: 'breathe', icon: 'flame', title: 'Breathe with the flame', dur: '3 min', why: 'You slept a little less than usual this week.', ember: 2, act: 'breathe' },
  { id: 'note', icon: 'note', title: 'Send Juno a kind note', dur: '2 min', why: 'Juno shared a small win yesterday.', ember: 2 },
  { id: 'walk', icon: 'walk', title: 'Take a slow walk outside', dur: '10 min', why: 'Walks have lined up with your brighter days.', ember: 3 },
  { id: 'music', icon: 'music', title: 'Play one song you love, start to finish', dur: '4 min', why: 'A small, easy lift.', ember: 1 },
  { id: 'drink', icon: 'drink', title: 'Make yourself a warm drink', dur: '5 min', why: 'A cozy pause counts.', ember: 1 },
];

export const COOP_GOAL = 12;
export const SYNC_OPTS = ['Rain on the windows', 'Fresh coffee', 'Old cartoons', 'A long slow walk', 'Pancakes', 'Sleeping in'];
export const SYNC_PICKS: Record<string, string> = { juno: 'Rain on the windows', teo: 'Fresh coffee', ama: 'Rain on the windows' };

export const OTHER_CAMPS: { n: string; d: string; a: Avatar[] }[] = [
  { n: 'Driftwood', d: 'Lit 3 weeks ago · loves board games', a: [
    { name: '', color: 'blueberry', face: 'happy', hat: 'bucket', glasses: 'none', acc: 'none', item: 'none' },
    { name: '', color: 'mint', face: 'calm', hat: 'none', glasses: 'round', acc: 'scarf', item: 'none' },
    { name: '', color: 'toasted', face: 'wink', hat: 'crown', glasses: 'none', acc: 'none', item: 'none' },
    { name: '', color: 'vanilla', face: 'content', hat: 'none', glasses: 'none', acc: 'bow', item: 'none' }] },
  { n: 'Mossy Hollow', d: 'Lit last week · early risers', a: [
    { name: '', color: 'mint', face: 'content', hat: 'sprout', glasses: 'none', acc: 'none', item: 'none' },
    { name: '', color: 'strawberry', face: 'happy', hat: 'beanie', glasses: 'none', acc: 'none', item: 'none' },
    { name: '', color: 'lavender', face: 'sleepy', hat: 'none', glasses: 'none', acc: 'none', item: 'none' }] },
  { n: 'Lantern Bay', d: 'Lit 2 months ago · music lovers', a: [
    { name: '', color: 'toasted', face: 'excited', hat: 'cap', glasses: 'sunnies', acc: 'none', item: 'none' },
    { name: '', color: 'blueberry', face: 'calm', hat: 'none', glasses: 'none', acc: 'flower', item: 'none' },
    { name: '', color: 'vanilla', face: 'happy', hat: 'bucket', glasses: 'none', acc: 'none', item: 'none' },
    { name: '', color: 'lavender', face: 'content', hat: 'none', glasses: 'hearts', acc: 'none', item: 'none' }] },
];

// Wellbeing signals for My Journey. In the Android build these are where Health Connect
// (sleep, steps) and UsageStats (screen time) readings plug in; for now they are sample data.
export const SLEEP14 = [7.4, 7.8, 7.1, 6.2, 7.0, 7.6, 8.1, 7.2, 6.1, 5.9, 6.4, 6.8, 7.3, 6.9];
export const STEPS14 = [5.2, 6.8, 4.1, 3.0, 5.5, 7.9, 9.2, 6.1, 3.4, 2.8, 4.6, 6.3, 7.1, 5.0];
export const MOOD14 = [3, 3, 4, 2, 3, 4, 4, 3, 2, 2, 3, 4, 4];
