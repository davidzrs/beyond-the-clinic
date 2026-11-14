import { Avatar } from './pixel/sprites';
import { themed, themeMode } from './theme';

export const ME_DEFAULT: Avatar = { name: 'Sam', color: 'vanilla', face: 'content', hat: 'beanie', glasses: 'none', acc: 'scarf', item: 'mug' };

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

export type ActType = 'daily' | 'together' | 'quest' | 'relax';
export type Act = { id: string; type: ActType; icon: string; title: string; desc: string; dur: string };
export const ACTS: Act[] = [
  { id: 'words', type: 'daily', icon: 'words', title: 'Ember Words', desc: 'Guess the cozy five-letter word in six tries. A new word every day.', dur: '3 min' },
  { id: 'light', type: 'daily', icon: 'sun', title: 'Find the Light', desc: 'Spot the little sun hiding among the rain clouds. Three quick rounds.', dur: '2 min' },
  { id: 'sync', type: 'together', icon: 'sync', title: 'MindSync', desc: 'Everyone at your fire answers the same prompt. See who thinks alike.', dur: '5 min' },
  { id: 'talk', type: 'together', icon: 'chat', title: 'Sunday Talk', desc: 'A weekly gathering with a gentle prompt. Come to talk or just to listen.', dur: 'Sun 19:00' },
  { id: 'sky', type: 'quest', icon: 'sky', title: 'Sky Break', desc: 'Step outside or to a window and look up for five minutes.', dur: '5 min' },
  { id: 'walk', type: 'quest', icon: 'walk', title: 'Slow Walk', desc: 'A ten-minute loop around the block. Any pace counts.', dur: '10 min' },
  { id: 'note', type: 'quest', icon: 'note', title: 'Kind Note', desc: 'Send a short, kind message to someone at your fire.', dur: '2 min' },
  { id: 'breathe', type: 'relax', icon: 'flame', title: 'Breathe with the Flame', desc: 'Follow the fire as it grows and settles. Three slow breaths.', dur: '3 min' },
  { id: 'forest', type: 'relax', icon: 'forest', title: 'Forest at Dusk', desc: 'Soft wind in the pines and the odd sleepy bird. Headphones help.', dur: 'Any length' },
  { id: 'sea', type: 'relax', icon: 'wave', title: 'Sea Breeze', desc: 'Slow waves rolling onto a quiet shore.', dur: 'Any length' },
];
export const TYPE_LABEL: Record<ActType, string> = { daily: 'Daily game', together: 'Together', quest: 'Quest', relax: 'Relax' };
export const TYPE_COLORS: Record<ActType, { bg: string; chipBg: string; chipFg: string; btn: 'ember' | 'green' | 'plum' }> = themed(() => (themeMode() === 'day' ? {
  daily: { bg: '#E8F1FB', chipBg: '#D3E5F8', chipFg: '#245E96', btn: 'ember' },
  together: { bg: '#FDEDEF', chipBg: '#F8D7DD', chipFg: '#9A3343', btn: 'ember' },
  quest: { bg: '#E4F4E8', chipBg: '#CCEAD5', chipFg: '#1E6A3F', btn: 'green' },
  relax: { bg: '#FFF2D9', chipBg: '#FDE3B0', chipFg: '#87570A', btn: 'plum' },
} : {
  daily: { bg: '#2e2752', chipBg: '#3d335f', chipFg: '#d6c9ff', btn: 'ember' },
  together: { bg: '#40263a', chipBg: '#5a2f3b', chipFg: '#ffc3cb', btn: 'ember' },
  quest: { bg: '#1e3a31', chipBg: '#24463a', chipFg: '#bfe8c9', btn: 'green' },
  relax: { bg: '#1d2e4f', chipBg: '#24375a', chipFg: '#c4dcff', btn: 'plum' },
}) as Record<ActType, { bg: string; chipBg: string; chipFg: string; btn: 'ember' | 'green' | 'plum' }>);
export const WORDS = ['SHINE', 'EMBER', 'BLOOM', 'CABIN', 'CLOUD', 'HONEY', 'LIGHT', 'OCEAN', 'PEACE', 'SPARK', 'TOAST', 'MAPLE', 'SMILE', 'QUIET', 'CREEK', 'GLOWS'];
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
