# Mellow

A cozy fire for hard days. Built at Junction 2026 for the Beyond the Clinic challenge.

When TMS treatment for depression ends, the risk of it coming back doesn't. Between the last session and the next appointment there is usually nobody watching, and the early signs (sleep slipping, fewer steps, more hours on the phone, a quieter week) go unnoticed until it is a relapse.

Mellow fills that gap. It notices those signs early, answers them with small, research-backed steps, and keeps people company in a small group of peers. When someone needs more than that, their clinic hears about it in time.

**Try it:** https://mellow-gamma-coral.vercel.app/

- As a patient, use the demo account on the log-in screen (`aino.virtanen@mellow.test`, password `123123123`) or create your own.
- As a clinician, click "Part of a care team?" and sign in as `laura.aalto@pinehollow.fi` (same password).

All patients in the demo use synthetic data.

## The science behind it

Mellow asks two things of a person each day, and both come from research rather than guesswork.

**1. A one-tap check-in: how are you today?** Short daily mood questions closely follow the PHQ-9, the questionnaire clinicians already use ([Burchert et al. 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7787464/)). Every 2 weeks the full PHQ-9 is asked, and its answers decide what the next 2 weeks focus on.

**2. One or two small steps, picked from those answers.** Each PHQ-9 question that is in the problem zone maps to a small, everyday version of an approach that has been tested for depression:

| If this is hard | The step | Based on |
|---|---|---|
| Interest and pleasure | 10 minutes of something you used to enjoy | Behavioural activation (Ekers et al. 2014) |
| Low mood | Write down 3 good things from today | Seligman et al. 2005 |
| Sleep | Same wake-up time, phone away at night | CBT for insomnia (Freeman et al. 2017) |
| Energy | A 10-minute walk, light stretching | Exercise for depression (Noetel et al. 2024) |
| Appetite | Regular, simple meals | Jacka et al. 2017 |
| Self-worth | Self-compassion writing | Ferrari et al. 2019 |
| Concentration | Better sleep and movement | No strong study for a single trick, so we don't invent one |
| Restlessness | 3 minutes of slow breathing | Balban et al. 2023 |
| Thoughts of self-harm | Never self-help: crisis resources and the care team | Safety planning (Stanley et al. 2018) |

Sleep always comes first, because it lifts almost everything else. Most of these studies tested full programmes, so we say our steps are *based on* them, not proven by them.

**What we watch in the background, and why.** Sleep regularity (irregular sleep nearly doubled the risk of relapse in people recovering from depression), resting heart rate and heart rate variability (lower with more severe depression, [Kemp et al. 2010](https://www.pubmed.gov/20138254/)), daily steps (Bizzozero-Peroni et al. 2024) and screen time (Saeb et al. 2015). Each one is compared with the person's own usual week, never with other people.

**Where the cut-offs come from.** We analysed the Moodpath dataset (185 people, 5,135 answers over 14 days). For each of the 9 PHQ-9 questions we found the score that best separates people with clinically relevant depression (PHQ-9 total of 10 or more) from those without, using Youden's J. On their own, single questions already separate the two groups with an AUC of 0.74 to 0.87. Those cut-offs are exactly the ones the app uses to decide what goes into someone's 2-week path. The full analysis is in [data-analysis/](data-analysis/results/report.md), and the synthetic demo patients are described in [data/](data/README.md).

**What we don't claim.** Mellow is a wellbeing companion and a summary for the clinician, not a diagnosis. The AI can be wrong and never gives medical advice. The cut-offs come from app users, not from people after TMS, so they still need to be validated in that group.

Every source, with links, is in [RESEARCH.md](RESEARCH.md).

## What's in it

**The app (phone and web).** A one-tap daily check-in that keeps a streak going. Sleep, heart, steps and screen time, always compared with your own normal, never with other people. Every 2 weeks a PHQ-9 check-in builds the next 2-week path: one or two small steps a day for the areas that are struggling. Each person sits at a campfire, a group of 4 with the same faces every week, a chat, a Sunday Talk and light daily puzzles. New accounts go through a short onboarding that picks their campfire and asks what they are comfortable sharing.

**Safety.** Every chat message is checked by Gemini before anyone sees it. Unkind messages are not posted and count as strikes. A message that sounds like a crisis is held back, the person sees crisis resources right away (112, the MIELI line), and if they turned crisis alerts on, their care team is alerted.

**The care portal.** For the clinic: patients sorted by how far their week has moved from their own normal, the reasons behind every flag, crisis alerts in real time, calls to schedule, and a biweekly report as a PDF.

**Mellow Shield.** A browser extension that gently hides content linked to relapse while keeping jokes and help resources visible. It runs entirely on the device. It can be downloaded from the Today page on a computer.

## Where things are

- `mellow/`: the app and the website (Expo, React Native, TypeScript). The care portal lives in `mellow/src/care/`. To run it yourself, see [mellow/README.md](mellow/README.md).
- `supabase/`: the database, its security rules and the Edge Functions for moderation, crisis alerts and Ember's polls. Setup is in [supabase/README.md](supabase/README.md).
- `data/` and `data-analysis/`: datasets, the synthetic demo data and the PHQ-9 analysis.
