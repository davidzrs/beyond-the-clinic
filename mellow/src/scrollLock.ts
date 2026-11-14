// Lets a game board stop the page from scrolling while a finger drags across it. On phones the native
// ScrollView takes vertical swipes before a JS gesture can, so the board switches page scrolling off on
// touch-down and back on when the finger lifts: directly on the native view (instant), and through state
// as a fallback.
type Listener = (locked: boolean) => void;
let pageScroll: any = null;
const listeners = new Set<Listener>();

export function registerPageScroll(r: any) { pageScroll = r; }
export function onScrollLock(f: Listener) { listeners.add(f); return () => { listeners.delete(f); }; }
export function lockPageScroll(locked: boolean) {
  try { pageScroll?.setNativeProps?.({ scrollEnabled: !locked }); } catch {}
  listeners.forEach((f) => f(locked));
}
