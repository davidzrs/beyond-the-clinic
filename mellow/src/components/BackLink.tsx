import React from 'react';
import { Pressable, Text } from 'react-native';
import { useApp } from '../state';
import { C, F } from '../theme';
import { Icon } from './Pixel';

const NAMES: Record<string, string> = { home: 'Today', campfire: 'Campfire', journey: 'Journey', games: 'Games' };

// "‹ Today" link for sub-pages: goes back to the tab you came from.
export function BackLink() {
  const S = useApp();
  return (
    <Pressable onPress={S.back} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
      <Icon name="back" size={18} /><Text style={{ fontFamily: F.displayMed, fontSize: 14, color: C.creamDim }}>{NAMES[S.backTo] || 'Back'}</Text>
    </Pressable>
  );
}
