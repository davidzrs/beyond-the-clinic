# Datasets for Mellow

Open datasets with smartwatch, sleep, heart, phone or mood data that fit the challenge.
**Used** = downloaded and used for calibration.

| Dataset | What's in it | People / length | Access | Licence | Status |
|---|---|---|---|---|---|
| [RTI crowd-sourced Fitbit](https://zenodo.org/records/53894) | Minute-level heart rate (every 5 s), sleep stages per minute, steps, activity, calories | 35 Fitbit users, 2 months (2016) | Open, no login | CC BY 4.0 | **Used** |
| [Depresjon](https://zenodo.org/records/1219550) ([Simula page](https://datasets.simula.no/depresjon/)) | Wrist actigraphy every minute, MADRS depression scores, age, gender, diagnosis type | 23 depressed + 32 controls, about 2 weeks each | Open, no login | CC BY-NC 4.0 | **Used** |
| [PMData](https://datasets.simula.no/pmdata) | Fitbit Versa 2 heart rate, sleep stages, steps, plus daily mood, stress, sleep quality, readiness | 16 people, 5 months | Open | CC BY-NC 4.0 | Good next step: has **self-reported mood and stress next to watch data**. Large download. |
| [LifeSnaps](https://zenodo.org/record/6826682) ([paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9622868/)) | Fitbit Sense sleep, heart rate, stress; mood check-ins (EMA); validated surveys | 71 people, 4 months | Some versions restricted | See record | Strong match for "watch + daily mood". Check access. |
| [StudentLife](https://studentlife.cs.dartmouth.edu/dataset.html) | Phone sensing (activity, sleep, phone use, location, conversations) + **PHQ-9** | 48 students, 10 weeks | Open (also on Kaggle) | See site | Phone-usage and depression link. 5 GB. |
| [GLOBEM](https://physionet.org/content/globem/1.1/) | Phone + Fitbit features, depression labels (BDI-II, PHQ-4) over 4 years | About 500 people | PhysioNet credentialed | PhysioNet licence | Best research-grade depression-sensing data; needs a PhysioNet account. |
| [OBF-Psychiatric](https://link.springer.com/article/10.1038/s41597-025-04384-3) | Depresjon + PSYKOSE + HYPERAKTIV actigraphy in one place | Several hundred | Open | See paper | Bigger version of what we used. |
| [HYPERAKTIV](https://datasets.simula.no/hyperaktiv) | Actigraphy + heart rate, ADHD vs clinical controls | 103 adults | Open | Research/education | Heart rate in a psychiatric population. |
| [Wearable HRV + sleep diaries (Sci Data 2025)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12375003/) | Samsung watch HRV, sleep diaries, biweekly depression/anxiety/insomnia questionnaires | 49 people, 4 weeks | See paper | See paper | **HRV + depression scores**, closest to our autonomic signal. |
| Kaggle "FitBit Fitness Tracker Data" (Möbius) | Same as the RTI Fitbit set, second month only | 30 users | Kaggle login | CC0 | Skip: the Zenodo copy above is complete. |

## Why these two first

- **No login and small**, so anyone on the team can reproduce the numbers.
- Together they cover the two halves of our story: what a **normal wearable week** looks like
  (Fitbit) and how **depression shows up in movement** (Depresjon).

## Ideas for the pitch

- Depresjon shows depressed patients' **morning activity is about half** of controls', which is
  exactly the kind of personal "relapse signature" Mellow watches for.
- Pair it with PMData or LifeSnaps if we want to show real self-reported mood next to watch data.
