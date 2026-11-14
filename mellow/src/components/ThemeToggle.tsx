import React from 'react';
import { Pressable } from 'react-native';
import { C, setThemeMode, themeMode } from '../theme';
import { Icon } from './Pixel';

// Day or night follows the clock (7:00-19:00 is day). Tapping the sun/moon flips it until the clock changes it again.
export function ThemeToggle({ bg = 'rgba(255,255,255,.16)', color }: { bg?: string; color?: string }) {
  const day = themeMode() === 'day';
  return (
    <Pressable onPress={() => setThemeMode(day ? 'night' : 'day')} accessibilityLabel={day ? 'Switch to night' : 'Switch to day'}
      style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Icon name={day ? 'moon' : 'sun'} size={20} color={color || (day ? C.heroText : '#FFD36B')} />
    </Pressable>
  );
}
