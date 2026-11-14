import { useWindowDimensions } from 'react-native';

export const SIDEBAR_W = 240;
export const MAX_W = 1160;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const pad = width < 640 ? 16 : 28;
  const cw = Math.min(MAX_W, width - (wide ? SIDEBAR_W : 0) - pad * 2);
  return { width, height, wide, pad, cw };
}
