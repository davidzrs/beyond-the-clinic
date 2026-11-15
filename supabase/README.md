# Backend setup (Supabase)

Start with `schema.sql`; each section below says which file to run next. The Gemini key lives only on Supabase, never in the app.

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
  If the person turned crisis alerts on (asked in the onboarding, changeable under Support), the care team
  gets an alert in the portal ("Reach out today").
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
