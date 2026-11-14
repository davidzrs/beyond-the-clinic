import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state';
import { C } from '../theme';
import { Icon } from '../components/Pixel';
import { Btn, Eyebrow, H1, Panel, T } from '../components/ui';
import { BackLink } from '../components/BackLink';
import { friendsWhoSolved, HiddenPicture, HotelMystery, LineOfSight } from '../games/PuzzleGames';
import { Tutorial, TUTORIALS } from '../games/Tutorial';

// Each daily puzzle gets its own page (not a sheet on top), so the board can use the whole screen.
// The rules live in a short tutorial (first visit, or How to play); the page keeps a single line.
const PAGES = {
  nono: { title: 'Hidden Picture', icon: 'picture', sub: 'Fill the grid from the number clues.', Game: HiddenPicture },
  sight: { title: 'Line of Sight', icon: 'eye', sub: 'Shade squares so every number sees just enough.', Game: LineOfSight },
  hotel: { title: 'Hotel Mystery', icon: 'key', sub: 'Place the guests and find who was alone with the safe.', Game: HotelMystery },
} as const;

// How many times you've solved it and who at your fire solved today's. Never times or scores.
export function puzzleSocialLine(count: number, friends: string[]) {
  const mine = count === 0 ? 'Not solved yet' : count === 1 ? 'Solved once' : `Solved ${count} times`;
  // Up to three names; with more, the first two and a count, so the line stays short with lots of friends.
  const rest = friends.length - 2;
  const fire = !friends.length ? 'nobody at your fire has solved today’s yet'
    : friends.length === 1 ? `${friends[0]} solved today’s`
    : friends.length <= 3 ? `${friends.slice(0, -1).join(', ')} and ${friends[friends.length - 1]} solved today’s`
    : `${friends[0]}, ${friends[1]} and ${rest} others solved today’s`;
  return `${mine} · ${fire}`;
}

export default function GameScreen() {
  const S = useApp();
  const id = (S.route in PAGES ? S.route : 'nono') as keyof typeof PAGES;
  const { title, icon, sub, Game } = PAGES[id];
  const friends = friendsWhoSolved(S.members.filter((m) => m.id !== 'me'), id);
  const [tutorial, setTutorial] = useState(false);
  // First visit to this puzzle: open the tutorial once saved progress has loaded.
  useEffect(() => { if (S.tutorialsLoaded && !S.tutorials[id]) setTutorial(true); }, [S.tutorialsLoaded, id]);
  const closeTutorial = () => { setTutorial(false); S.markTutorialSeen(id); };
  return (
    // Hotel Mystery uses the full width (cards | board | tools); the grid puzzles stay narrow.
    <View style={{ gap: 16, width: '100%', maxWidth: id === 'hotel' ? undefined : 620, alignSelf: 'center' }}>
      <BackLink />
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ gap: 6 }}>
            <Eyebrow>Daily puzzle</Eyebrow>
            <H1>{title}</H1>
          </View>
          <Btn sm kind="ghost" icon="info" label="How to play" onPress={() => setTutorial(true)} />
        </View>
        <T style={{ color: C.creamDim }}>{sub}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="people" size={16} color={C.muted} />
          <T muted style={{ fontSize: 13.5 }}>{puzzleSocialLine(S.puzzleCount(id), friends)}</T>
        </View>
      </View>
      <Panel>
        <Game key={id} solved={S.puzzleSolvedToday(id)} onDone={() => S.solvePuzzle(id, title, icon)} />
      </Panel>
      {tutorial ? <Tutorial key={id} steps={TUTORIALS[id]} onClose={closeTutorial} /> : null}
    </View>
  );
}
