# Mellow Care · clinician portal

The care team's side of the Mellow website. A psychiatrist or nurse sees which post-TMS patients may need
a call, why, and how each person's score, signals and questionnaires have moved.

It is part of the Mellow app (one website): on the sign-in page, **"Part of a care team?"** (or going straight to `/care/login`) opens the care
team sign-in, and any care team account that signs in on the normal form is sent here too. It runs on the
web only (phones show a short note pointing to the website), and it's loaded on demand, so patients never
download it. Signing out of the portal goes back to the Mellow sign-in.

## Run it

Start the Mellow app on the web (`npx expo start --web` in `mellow/`), open it and choose "Part of a care team?", or go to http://localhost:8081/care/login.

## Accounts (Supabase)

Every demo account uses the password `123123123`:

- Clinicians: `laura.aalto@pinehollow.fi`, `mikko.saari@pinehollow.fi` (any `@pinehollow.fi` account is care team)
- Patients: `aino.virtanen@mellow.test`, `lauri.korhonen@mellow.test`, `mikael.nieminen@mellow.test`, `sam.kallio@mellow.test`,
  `juha.makinen@mellow.test`, `eveliina.hamalainen@mellow.test`, `kaisa.laine@mellow.test`, `pekka.heikkinen@mellow.test`,
  `riikka.koskinen@mellow.test`, `tuomas.jarvinen@mellow.test`, `noora.lehtonen@mellow.test`, `otto.salminen@mellow.test`

Setup, once: in Supabase run `supabase/schema.sql`, `supabase/care.sql` and `supabase/api.sql`, then create the
accounts and their 90 days of data from the `mellow/` folder: `node scripts/seed-care.mjs` (safe to run again).

Patients can log into the Mellow app with these too. Anyone who signs up in the app appears in the portal with
their real daily check-ins, live. Notes and planned calls are stored in Supabase and shared by the whole care team.

## What's in it

- **Patients**: everyone who shares their trends, sorted by who has moved furthest from their own normal,
  with level, 0–100 score, the last 4 weeks and the top reasons. Filter by level or search by name.
- **Patient page**: score over 90 days with the 30 / 55 thresholds, why the score moved this week,
  PHQ-9 and WHO-5 history, 8 signals against the person's usual range, notes and calls.
- **Biweekly report**: a one-page summary of the last 14 days with a **Download PDF** button (A4, one page).
- **View as of**: the slider in the top bar shows the whole portal as it was on any earlier day.

Without Supabase keys the portal falls back to generated demo patients (`data.ts`) and front-end-only
demo accounts.
