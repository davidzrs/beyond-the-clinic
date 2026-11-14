# Mellow API

Everything runs on Supabase. Base URL: `https://pwlfawvhfebdagiwmbkj.supabase.co`

Every request needs two headers:

```
apikey: <publishable key from mellow/.env>
Authorization: Bearer <access token of the signed-in user>
```

Row-level security decides what each person can see: patients only themselves, clinicians
(`@pinehollow.fi` accounts) every patient.

## Sign in

| | |
|---|---|
| `POST /auth/v1/token?grant_type=password` | body `{"email": "...", "password": "..."}` → `access_token` |
| `POST /auth/v1/signup` | body `{"email": "...", "password": "...", "data": {"name": "..."}}` |

## Patient (Mellow app)

| Endpoint | What it does |
|---|---|
| `POST /rest/v1/rpc/submit_checkin` body `{"p_mood": "heavy", "p_day": "2026-11-14"}` | Daily "How are you feeling today?" (`heavy`, `low`, `okay`, `good`, `bright`). Saves it, puts the mood into today's summary and returns `{day, mood, streak}`. |
| `POST /rest/v1/rpc/submit_phq9` body `{"p_answers": [0,1,2,1,0,1,2,0,0]}` | The 2-weekly PHQ-9. Returns `{day, score}`. |
| `GET /rest/v1/profiles?select=*` | My profile (name, marshmallow, streak). |
| `PATCH /rest/v1/profiles?id=eq.<my id>` body `{"name": "...", "avatar": {...}}` | Edit my name or marshmallow. |
| `GET /rest/v1/daily_metrics?select=*&order=day` | My daily summaries (sleep, heart, steps, screen time, mood, score). |
| `POST /rest/v1/messages` body `{"campfire_id": "...", "text": "..."}` | Say something at my campfire. |
| `POST /rest/v1/rpc/join_campfire` | Join (or find) my campfire; returns its id. |

## Care team (portal)

| Endpoint | What it does |
|---|---|
| `GET /rest/v1/rpc/care_overview` | One row per patient: latest score and reasons, last check-in and mood, streak. |
| `GET /rest/v1/daily_metrics?user_id=eq.<patient id>&order=day` | A patient's daily trends. |
| `GET /rest/v1/checkins?user_id=eq.<patient id>` | A patient's daily moods. |
| `GET /rest/v1/questionnaires?user_id=eq.<patient id>` | PHQ-9 / WHO-5 over time. |
| `GET /rest/v1/care_notes` / `POST /rest/v1/care_notes` body `{"patient_id": "...", "text": "...", "author_name": "..."}` | Shared notes. |
| `GET /rest/v1/care_calls` / `POST /rest/v1/care_calls` body `{"patient_id": "...", "when_text": "...", "reason": "..."}` / `DELETE /rest/v1/care_calls?id=eq.<id>` | Planned calls. |

The portal also listens for changes (Supabase Realtime), so a patient's check-in shows up on the
clinician's screen within a second or two.

## Example: check in as Aino

```bash
TOKEN=$(curl -s "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"aino.virtanen@mellow.test","password":"123123123"}' | jq -r .access_token)

curl -s "$URL/rest/v1/rpc/submit_checkin" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"p_mood":"heavy"}'
```
