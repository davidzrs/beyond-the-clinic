# Mellow

Mobile companion for staying well after depression treatment (Junction 2026 · Beyond the Clinic).

- `mellow/` — the app (Expo / React Native) and the website. Patients sign in to the app; on the web,
  "Part of a care team?" on the sign-in page (or `/care/login`) opens the clinician portal (`mellow/src/care/`)
- `data-analysis/` — PHQ-9 dataset analysis
- `RESEARCH.md` — the research behind our suggestions and the signals we track

## Run the app on an Android phone

All commands run inside `mellow/`. First time: `npm install`.

### Option A — Expo Go (fastest, live reload)

1. Install **Expo Go** from the Play Store.
2. `npm start` and scan the QR code with Expo Go (phone and PC on the same Wi-Fi).
   With the phone plugged in via USB, press `a` instead.
   If the network blocks it: `npm run start:tunnel`.

Needs the PC running the dev server.

### Option B — native build on your phone (Android Studio toolchain)

Needs Android Studio installed (it brings the Android SDK and a JDK) and the phone plugged in with USB debugging on.

| Command | What you get |
|---|---|
| `npm run android:dev` | Debug build installed on the phone/emulator, then the dev server starts from your folder: save a file and the app updates instantly (Fast Refresh). Keep the terminal running. |
| `npm run dev` | Day-to-day: skips the native build and just starts the dev server and opens the installed debug app. Use it when you only changed JavaScript/TypeScript. |
| `npm run android:release` | Standalone release build with the JavaScript bundled in. Runs on the phone without the PC — use this for the demo. |

`android:dev` and `android:release` go through `scripts/android.js`, which first finds the Android SDK and writes `android/local.properties`, uses Android Studio's JDK, installs any missing SDK platform / build-tools / NDK with `sdkmanager` (type `y` if it asks you to accept a licence), and builds only for your phone's CPU. The first build takes a while; later ones are much faster.

On Windows, React Native's C++ build breaks when paths pass 260 characters. If the project folder is long or has spaces (like `Desktop\Beyond the clinic\...`), the script copies the app to `C:\mellow-build`, installs dependencies there once, and builds from that copy. Your files stay the source: every run re-syncs the copy. Set `MELLOW_NO_MIRROR=1` to turn this off.

`mellow/android/` is generated and git-ignored; never edit it by hand. Open it in Android Studio if you want Logcat or the debugger.

If something breaks: `npx expo-doctor`, then `npx expo install --fix`. Add libraries with `npx expo install <package>`, not `npm install`.

## The website (app + clinician portal)

One website for everyone. Inside `mellow/`:

```bash
npx expo start --web
```

Open http://localhost:8081. Patients sign in (or "Try the demo"); clinicians and therapists click **"Part of a care team?"** or open http://localhost:8081/care/login.
Demo accounts (password `123123123`): `laura.aalto@pinehollow.fi` for the care team, `aino.virtanen@mellow.test`
and the other patients for the app. More in `mellow/src/care/README.md`.

## Campfire chat moderation (Gemini)

Chat messages don't go straight into the database: the app calls the `send-message` Edge Function
(`supabase/functions/send-message/`), which asks Gemini whether the text breaks the campfire rules.
Venting about your own bad day is always allowed; insults, hate, sexual content, threats, pushing someone
towards self-harm, spam and sharing private details are blocked. A blocked message is not sent and counts
as a strike; after 3 strikes you can still read the chat but not post. Strikes are in the `chat_strikes` table
(delete someone's rows there to give them their voice back).

The Gemini key lives only on Supabase, never in the app. One-time setup, from the repo root:

1. Supabase SQL Editor: run `supabase/chat-moderation.sql`.
2. Deploy the function and give it the key:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase secrets set GEMINI_API_KEY=<your-key>
```

```bash
npx supabase functions deploy send-message
```

Try the prompt locally first (no deploy needed): copy `supabase/functions/.env.example` to
`supabase/functions/.env`, fill in the key, then

```bash
node --env-file=supabase/functions/.env supabase/functions/send-message/check.ts
```

## Crisis support and Ember's sparks

Built on the moderation above.

- **Crisis:** when a chat message sounds like the writer may be in danger, it is held (friends never see it, no strike)
  and the app opens crisis resources: 112, the MIELI crisis line, the care team and a breathing exercise.
  If the person said yes to the question shown after sign-up, the care team gets an alert in the portal
  ("Reach out today"). The alert says only *that* it happened and when, never what was written.
  The answer can be changed anytime under Support.
- **Sparks:** when a campfire has been quiet for 2 days, Ember (the campfire's AI) posts a "this or that" poll
  to get people talking. At most one a day. Ember is always labelled as an AI and only asks light questions:
  never health, never advice, never a diagnosis.

Setup, after the moderation steps above:

1. Supabase SQL Editor: run `supabase/chat-care.sql`.
2. Deploy the updated send-message and the new spark function (same `GEMINI_API_KEY` secret):

```bash
npx supabase functions deploy send-message
```

```bash
npx supabase functions deploy campfire-spark
```

Try Ember's polls locally:

```bash
node --env-file=supabase/functions/.env supabase/functions/campfire-spark/check.ts
```

## Campfires: several per person, invite codes

A person can sit at up to 6 campfires of 4 people each. New accounts are still seated at one
automatically, so nobody starts alone. Tap the campfire's sign (top left of the Campfire screen) for
**Your campfires**: switch between them, **Start a new campfire**, **Join with a code**, or leave one
(never your last). The fire on screen is remembered on the device.

Every campfire has its own invite code (like `PINE-7K2Q`), shown under the campfire's Invite button.
A friend types it under **Join with a code** to take a seat there too. Codes ignore case, spaces and dashes.

Setup: Supabase SQL Editor, run `supabase/campfire-invites.sql` (after `schema.sql`). Existing fires get
a code straight away. Until it runs, the app still works with the fires people already sit at, but
shows no code and can't create, join or leave fires.
