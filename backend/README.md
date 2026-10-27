# Study Buddy backend (P3)

Express 5 + MySQL 8 (mysql2), JWT login. Runs on **http://localhost:3000**.

## Run it

1. Build the database first (see `docs/SETUP.md` in the repo root).
2. In this folder:
   ```
   npm install
   copy .env.example .env      (Mac/Linux: cp .env.example .env)
   ```
   Edit `.env`: your MySQL user/password, and any long random `JWT_SECRET`.
3. `npm run dev` (restarts on file changes) or `npm start`.
4. Check: open http://localhost:3000/api/health and expect `{"status":"ok","db":"connected"}`.

## Rules followed

- Every query is parameterized (`?` placeholders); no SQL is built by string concatenation.
- The matching and group-creation logic lives in P2's stored procedures
  (`sp_match_candidates`, `sp_create_study_group`) and views; the backend only calls them.
- Errors always come back as `{ "error": "readable text", "code": "CODE" }`.
  Database trigger errors (`"CODE: text"`) are split into that shape by `middleware/errorHandler.js`.

## API

All routes except `/api/health`, `/api/subjects`, `/api/auth/register` and `/api/auth/login`
need the header `Authorization: Bearer <token>` (the token comes from login/register).

| Method | Route | Body / query | Returns |
|---|---|---|---|
| GET | `/api/health` | | `{status, db}` |
| POST | `/api/auth/register` | `{name, email, password, year, branch}` | `{token, student}` |
| POST | `/api/auth/login` | `{email, password}` | `{token, student}` |
| GET | `/api/auth/me` | | `{student_id, name, email, year, branch}` |
| GET | `/api/subjects` | | `[{subject_id, name}]` |
| GET | `/api/profile` | | student + `subjects[]` + `availability[]` |
| PUT | `/api/profile/subjects` | `{subjects: [{subject_id, skill_level 1-5}]}` | updated profile (replaces the list) |
| PUT | `/api/profile/availability` | `{slots: [{day_of_week 1-7, start_time "HH:MM", end_time, mode_preference}]}` | updated profile (replaces all slots) |
| GET | `/api/dashboard` | | `{student, streak, longest_streak, upcoming_sessions[], groups[]}` |
| GET | `/api/groups` | `?subject_id=&mode=` | groups with `member_count`, `max_size`, `next_session`, `avg_rating`, `is_member` |
| GET | `/api/groups/:id` | | group + `members[]` + `sessions[]` (location and attendance only for members) |
| POST | `/api/groups/:id/join` | | `{group_id, status}`; 409 `GROUP_FULL` / `SESSION_OVERLAP` / `ALREADY_EXISTS` |
| POST | `/api/groups/:id/leave` | | `{group_id, status}` |
| GET | `/api/match/candidates` | `?subject_id=&date=YYYY-MM-DD` | `{subject, date, my_free_minutes, max_picks: 3, candidates[]}` with score breakdown |
| POST | `/api/match/group` | `{subject_id, name, mode, date, start_time, end_time, location_or_link, member_ids: [1-3 ids]}` | `{group_id, session_id}`; 409 `STUDENT_BUSY` if someone was booked meanwhile |
| GET | `/api/sessions` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` | my sessions (calendar) |
| POST | `/api/sessions/:id/attendance` | `{status: present/absent/excused}` | marks myself; 403 `NOT_A_MEMBER` |
| POST | `/api/sessions/:id/feedback` | `{rating 1-5, comment?}` | 403 `NOT_ATTENDED` unless marked present |

Dates/times: availability and the `date`/`start_time` sent by the app are local time (India, `APP_TZ_OFFSET`);
`start_datetime` values are stored and returned in UTC (ISO strings ending in `Z`).

## Quick test with curl

```
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"riya@studybuddy.test\",\"password\":\"password123\"}"
curl http://localhost:3000/api/dashboard -H "Authorization: Bearer <paste token>"
```
