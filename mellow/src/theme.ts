import { Platform } from 'react-native';

// Two palettes: a happy daytime one (sky, grass, sunny cream) and a night one (indigo dusk, firelight amber,
// aurora greens). The app picks one from the time of day; the sun/moon button in the top bar overrides it.
// Token names are historical: night* = surfaces, cream = main text, ember = primary accent, navyDeep = header band.
type Palette = Record<
  | 'night' | 'night2' | 'night3' | 'night4' | 'line' | 'lineHi' | 'plum' | 'plumSoft' | 'forest' | 'moss'
  | 'ember' | 'emberHi' | 'emberInk' | 'cream' | 'creamDim' | 'muted' | 'rose' | 'ink' | 'white'
  | 'navySoft' | 'navyDeep' | 'heroText' | 'heroDim' | 'peach' | 'greenSoft' | 'amber' | 'amberSoft'
  | 'roseSoft' | 'fire' | 'glass' | 'iconWell' | 'navBg',
  string
>;

const DAY: Palette = {
  night: '#F1F7FD',     // page: the palest sky
  night2: '#FFFFFF',    // cards
  night3: '#EAF3FB',    // rows and tiles inside cards
  night4: '#DCEBF8',    // chips, ghost buttons, tracks
  line: '#D6E6F4',
  lineHi: '#A8C8E6',
  plum: '#4A8FD3',      // secondary: sky blue
  plumSoft: '#8FC0EA',
  forest: '#3C9A5B',    // green buttons: fresh grass
  moss: '#3C9A5B',      // done / good
  ember: '#2F8B54',     // primary: grass green (sky + grass, like the daytime campfire)
  emberHi: '#277548',   // highlighted text
  emberInk: '#FFFFFF',  // text on primary
  cream: '#1C2A3A',     // main text: deep blue-black
  creamDim: '#46576B',
  muted: '#7A8A9D',
  rose: '#D2475A',
  ink: '#1C2A3A',
  white: '#FFFFFF',
  navySoft: '#E2F3E7',  // primary tint
  navyDeep: '#4FA2E2',  // header band: clear sky
  heroText: '#FFFFFF',
  heroDim: '#E3F1FD',
  peach: '#FFE3B0',     // sunshine behind the marshmallow
  greenSoft: '#E2F3E7',
  amber: '#A86E00',
  amberSoft: '#FFF2CF',
  roseSoft: '#FDE6EA',
  fire: '#F07A2E',
  glass: 'rgba(255,255,255,.94)',
  iconWell: 'rgba(255,255,255,.8)',
  navBg: 'rgba(255,255,255,.97)',
};

const NIGHT: Palette = {
  night: '#0E1430',     // page: night sky
  night2: '#18203F',    // cards
  night3: '#212A4E',
  night4: '#2B355E',
  line: '#2A3460',
  lineHi: '#46528A',
  plum: '#7F8CF0',      // secondary: starlight periwinkle
  plumSoft: '#AEB7F6',
  forest: '#2C9D7A',    // green buttons: aurora
  moss: '#78DDB0',
  ember: '#FFB45E',     // primary: firelight amber
  emberHi: '#FFC77A',
  emberInk: '#2A1708',  // dark text on amber
  cream: '#F3EEE6',     // main text: moonlight
  creamDim: '#C3C8DE',
  muted: '#8E96BC',
  rose: '#FF8E9E',
  ink: '#1C2235',       // dark text on light bubbles
  white: '#FFFFFF',
  navySoft: '#33304A',  // amber tint on night
  navyDeep: '#1D2652',  // header band: a touch lighter than the sky
  heroText: '#F3EEE6',
  heroDim: '#A9B3E2',
  peach: '#F7CF9C',     // firelight behind the marshmallow
  greenSoft: '#173A3A',
  amber: '#FFC77A',
  amberSoft: '#3A3123',
  roseSoft: '#3D2238',
  fire: '#FF8A3D',
  glass: 'rgba(24,32,63,.92)',
  iconWell: 'rgba(255,255,255,.07)',
  navBg: 'rgba(14,20,48,.97)',
};

export type Mode = 'day' | 'night';
export const autoMode = (d = new Date()): Mode => (d.getHours() >= 7 && d.getHours() < 19 ? 'day' : 'night');
function initialMode(): Mode {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const q = (window.location.search.match(/theme=(day|night)/) || [])[1] as Mode | undefined; // for screenshots
    if (q) return q;
  }
  return autoMode();
}

let mode: Mode = initialMode();
let version = 0;
const listeners = new Set<() => void>();
export const C: Palette = { ...(mode === 'day' ? DAY : NIGHT) };

export function themeMode() { return mode; }
export function themeVersion() { return version; }
export function setThemeMode(m: Mode) {
  if (m === mode) return;
  mode = m; Object.assign(C, m === 'day' ? DAY : NIGHT); version++;
  listeners.forEach((f) => f());
}
export function onTheme(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

// An object (usually a StyleSheet) rebuilt from the current palette whenever the theme changes.
export function themed<T extends object>(make: () => T): T {
  let cache = make(); let v = version;
  const cur = () => { if (v !== version) { cache = make(); v = version; } return cache as any; };
  return new Proxy({} as T, {
    get: (_, k) => cur()[k],
    has: (_, k) => k in cur(),
    ownKeys: () => Reflect.ownKeys(cur()),
    getOwnPropertyDescriptor: (_, k) => { const d = Object.getOwnPropertyDescriptor(cur(), k); return d ? { ...d, configurable: true } : undefined; },
  });
}

export const F = {
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
  displayMed: 'Outfit_500Medium',
  label: 'Outfit_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyXBold: 'Nunito_800ExtraBold',
};

export const R = { card: 14, btn: 10, pill: 999 };
