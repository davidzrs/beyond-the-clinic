import React from 'react';
import { View } from 'react-native';
import { useApp } from '../state';
import { C } from '../theme';
import { Eyebrow, H1, Panel, T } from '../components/ui';
import { BackLink } from '../components/BackLink';
import { HiddenPicture, HotelMystery, LineOfSight } from '../games/PuzzleGames';

// Each daily puzzle gets its own page (not a sheet on top), so the board can use the whole screen.
const PAGES = {
  nono: { title: 'Hidden Picture', icon: 'picture', sub: 'Fill the grid from the number clues.', Game: HiddenPicture },
  sight: { title: 'Line of Sight', icon: 'eye', sub: 'Shade squares so every number sees just enough.', Game: LineOfSight },
  hotel: { title: 'Hotel Mystery', icon: 'key', sub: 'Place the guests and find who was alone with the safe.', Game: HotelMystery },
} as const;

export default function GameScreen() {
  const S = useApp();
  const id = (S.route in PAGES ? S.route : 'nono') as keyof typeof PAGES;
  const { title, icon, sub, Game } = PAGES[id];
  return (
    // Hotel Mystery uses the full width (cards | board | tools); the grid puzzles stay narrow.
    <View style={{ gap: 16, width: '100%', maxWidth: id === 'hotel' ? undefined : 620, alignSelf: 'center' }}>
      <BackLink />
      <View style={{ gap: 6 }}>
        <Eyebrow>Daily puzzle</Eyebrow>
        <H1>{title}</H1>
        <T style={{ color: C.creamDim }}>{sub}</T>
      </View>
      <Panel>
        <Game key={id} onDone={() => S.finishAct(id, title, icon)} />
      </Panel>
    </View>
  );
}
