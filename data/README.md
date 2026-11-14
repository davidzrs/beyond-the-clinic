# Mellow demo data

Real open datasets for calibration, plus a synthetic generator that produces the
smartwatch, phone and check-in data the Mellow demo shows.

```
data/
  raw/          downloaded open datasets (not committed; see "Get the raw data")
  processed/    small tables + calibration.json extracted from the raw data
  synthetic/    generated demo data (CSV + JSON)
  scripts/
    analyze.mjs   raw -> processed (stats used for calibration)
    generate.mjs  calibration -> synthetic data + mellow/src/demo/demoData.json
  DATASETS.md   catalogue of datasets we looked at, with links and licences
```

## Regenerate everything

```bash
node data/scripts/analyze.mjs
node data/scripts/generate.mjs
```

`generate.mjs` is seeded, so it always produces the same data. It also works
without the raw data (it falls back to built-in population values).

## Get the raw data

Both datasets are open and need no login (about 50 MB zipped):

| Dataset | Download | Licence |
|---|---|---|
| RTI crowd-sourced Fitbit (35 users, minute-level heart rate, sleep, steps) | https://zenodo.org/records/53894 | CC BY 4.0 |
| Depresjon (actigraphy, 23 depressed patients + 32 controls, MADRS scores) | https://zenodo.org/records/1219550 | CC BY-NC 4.0 |

Unzip them into `data/raw/fitbit_mar_apr`, `data/raw/fitbit_apr_may` and
`data/raw/depresjon`.

## What the real data told us

From `processed/calibration.json`:

- **Sleep** (Fitbit, 1,509 person-days): 7.2 h on average, efficiency 92%.
- **Resting heart rate**: 62 bpm on average; heart rate is lowest around 4 am and highest late afternoon.
- **Steps**: about 8,200 a day, varying about ±40% day to day for the same person.
- **Depression and movement** (Depresjon): depressed patients moved about 12% less overall,
  but the biggest gap is the **morning**: between 6 and 10 am their activity was about **half**
  of healthy controls'. Their activity also varied less from day to day (a flatter routine).

These shape the synthetic data and the early-warning signals Mellow watches.

## The synthetic data

90 days (17 Aug to 14 Nov 2026) for four people, matching the app's campfire:

| Person | Story |
|---|---|
| **Sam** (the user) | Post-TMS. Stable for 7 weeks, then a slow relapse drift from day 53, flagged by Mellow on day 60 ("watch") and day 63 ("high"), care plan from day 64, recovered by about day 83. |
| Juno, Teo, Ama | Campfire friends with different baselines. Stay steady (early-warning score never above 15). |

Per day (`synthetic/<name>_daily.csv`): sleep hours, time in bed, efficiency, bedtime, wake time,
awakenings, deep/REM/light minutes, resting heart rate, HRV (RMSSD), steps, morning steps (6 to 10 am),
active and outdoor minutes, screen time, late-night screen time, messages sent, check-in mood
(1 Heavy to 5 Bright, blank when skipped), the early-warning score, its level and the top reasons.

Also:
- `<name>_questionnaires.csv`: weekly WHO-5 and fortnightly PHQ-9 (total score only).
- `sam_night_minutes_day30.csv` / `_day66.csv`: minute-by-minute sleep stage and heart rate for a
  calm night and a relapse night.
- `clinic_panel.csv`: a 12-patient list for the clinician view, sorted by risk.
- `demo_bundle.json` / `mellow/src/demo/demoData.json`: everything the app needs in one file.

### How the relapse is modelled

A relapse level goes smoothly from 0 to 1 and back. At full level, compared with Sam's normal:

| Signal | Change | Based on |
|---|---|---|
| Sleep | +1.3 h, efficiency −7 points, more awakenings, later bedtime | hypersomnia and fragmented sleep in depression |
| Resting heart rate / HRV | +5 bpm / −24% | autonomic changes reported in depression |
| Steps | about −25% | Depresjon (−12%, amplified for visibility) |
| Morning activity | about −46% | Depresjon 6 to 10 am profile |
| Day-to-day variation | lower | Depresjon |
| Screen time / late-night use | about 2.4× / +70 min | phone-sensing literature |
| Messages to friends | −65% | social withdrawal |
| Check-in mood | −1.8 points, more skipped days | |

### The early-warning score

For each signal, Mellow compares the last 7 days with the person's own baseline: their last 28
**steady** days (days already flagged are excluded, so a slow drift can't become the new normal).
Each signal's deviation is measured in that person's usual day-to-day swings, weighted, and combined
into 0 to 100: under 30 **steady**, 30 to 55 **watch**, 55+ **high**. Signals that moved more than
one usual swing are listed as reasons, for example "Late-night phone use +49 min".

**This is a demo heuristic, not a validated clinical model.** It shows how a personal-baseline,
explainable early-warning system could work.

## Licences and citation

- RTI Fitbit data: Furberg R, Brinton J, Keating M, Ortiz A. *Crowd-sourced Fitbit datasets 03.12.2016-05.12.2016*. Zenodo, 2016. doi:10.5281/zenodo.53894. CC BY 4.0.
- Depresjon: Garcia-Ceja E, Riegler M, Jakobsen P, et al. *Depresjon: A Motor Activity Database of Depression Episodes in Unipolar and Bipolar Patients*. MMSys 2018. doi:10.5281/zenodo.1219550. CC BY-NC 4.0 (non-commercial; fine for a hackathon or research demo).
- The synthetic data in `synthetic/` is generated by our script and contains no real person's data.
