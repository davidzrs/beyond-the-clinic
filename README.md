# Mellow

A cozy fire for hard days. Built at Junction 2026 for the Beyond the Clinic challenge.

When TMS treatment for depression ends, the risk of it coming back doesn't. Between the last session and the next appointment there is usually nobody watching, and the early signs (sleep slipping, fewer steps, more hours on the phone, a quieter week) go unnoticed until it is a relapse.

Mellow fills that gap. It notices those signs early, answers them with small, research-backed steps, and keeps people company in a small group of peers. When someone needs more than that, their clinic hears about it in time.

**Try it:** https://mellow-gamma-coral.vercel.app/

- As a patient, use the demo account on the log-in screen (`aino.virtanen@mellow.test`, password `123123123`) or create your own.
- As a clinician, click "Part of a care team?" and sign in as `laura.aalto@pinehollow.fi` (same password).

All patients in the demo use synthetic data.

## The science behind it: read [RESEARCH.md](RESEARCH.md)

Nothing in Mellow is there because it looks nice. Every small step the app suggests and every signal it watches is tied to a published study, and [RESEARCH.md](RESEARCH.md) shows which one, why, and how far the evidence really goes. If you read one file in this repo, make it that one.

The thresholds that decide what goes into someone's 2-week path come from our own analysis of the Moodpath PHQ-9 dataset, in [data-analysis/](data-analysis/results/report.md).

## What's in it

**The app (phone and web).** A one-tap daily check-in that keeps a streak going. Sleep, heart, steps and screen time, always compared with your own normal, never with other people. Every 2 weeks a PHQ-9 check-in builds the next 2-week path: one or two small steps a day for the areas that are struggling. Each person sits at a campfire, a group of 4 with the same faces every week, a chat, a Sunday Talk and light daily puzzles. New accounts go through a short onboarding that picks their campfire and asks what they are comfortable sharing.

**Safety.** Every chat message is checked by Gemini before anyone sees it. Unkind messages are not posted and count as strikes. A message that sounds like a crisis is held back, the person sees crisis resources right away (112, the MIELI line), and if they turned crisis alerts on, their care team is alerted.

**The care portal.** For the clinic: patients sorted by how far their week has moved from their own normal, the reasons behind every flag, crisis alerts in real time, calls to schedule, and a biweekly report as a PDF.

**Mellow Shield.** A browser extension that gently hides content linked to relapse while keeping jokes and help resources visible. It runs entirely on the device. It can be downloaded from the Today page on a computer.

## Where things are

- `mellow/`: the app and the website (Expo, React Native, TypeScript). The care portal lives in `mellow/src/care/`. To run it yourself, see [mellow/README.md](mellow/README.md).
- `supabase/`: the database, its security rules and the Edge Functions for moderation, crisis alerts and Ember's polls. Setup is in [supabase/README.md](supabase/README.md).
- `data/` and `data-analysis/`: datasets, the synthetic demo data and the PHQ-9 analysis.
