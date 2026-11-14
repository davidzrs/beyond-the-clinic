# Mellow Care · clinician portal

A small React (Vite + TypeScript) site for the care team: a psychiatrist or nurse signs in and sees which
post-TMS patients may need a call, why, and how each person's score, signals and questionnaires have moved.

It reads the same demo data as the app (`../mellow/src/demo/demoData.json`), so Sam's timeline matches My Journey.

## Run it

```bash
cd care-portal
npm install
npm run dev        # http://localhost:5180
```

| What | Port |
|---|---|
| Portal (dev) | **5180** |
| Portal (`npm run build && npm run preview`) | **5181** |
| Mellow app (Expo / Metro) | 8081 |

Both portal ports use `strictPort`: if 5180 is already taken, Vite stops with an error instead of quietly
moving to another port. Close the old server (or the other terminal) and run it again.

## Demo sign-in

| Account | Password |
|---|---|
| laura.aalto@pinehollow.fi (psychiatrist) | `mellow` |
| mikko.saari@pinehollow.fi (psychiatric nurse) | `mellow` |

The login is a front-end demo only (no server, no real accounts). Notes, scheduled calls and "reviewed"
marks are kept in this browser's localStorage.

## What's in it

- **Patients**: everyone who shares their trends, sorted by who has moved furthest from their own normal,
  with level, 0–100 score, the last 4 weeks and the top reasons. Filter by level or search by name.
- **Patient page**: score over 90 days with the 30 / 55 thresholds, why the score moved this week,
  PHQ-9 and WHO-5 history, 8 signals against the person's usual range, notes and calls.
- **Biweekly report**: a one-page summary of the last 14 days (who needs a call, level changes,
  PHQ-9 results, check-in gaps) with a **Download PDF** button (A4, one page). The arrows step
  back and forward one report at a time.
- **View as of**: the slider in the top bar shows the whole portal as it was on any earlier day,
  so you can look back at someone's progression quickly. In the demo it covers the 90 days
  (for example day 63, when Sam's first "call suggested" alert fires).

Sam's data is the generated 90-day timeline. The other clinic patients only have a snapshot in the JSON,
so their histories are generated in `src/data.ts` from a fixed seed and end exactly at that snapshot.
