# Open questions (P2)

Documented defaults are in force until the team answers. Do not treat these as silent guesses.

| ID | Question | Default in P2 code | Who |
| --- | --- | --- | --- |
| Q1 | P1 schema path / table names (PascalCase vs snake_case)? | Unquoted snake_case per `db/p2/naming_map.md`. | P1 |
| Q2 | `skill_level` type and range? | `SMALLINT` 1–5. `max_range` = 4 in `v_match_weights`. | P1 |
| Q3 | `day_of_week` encoding? | ISO-8601: 1=Monday … 7=Sunday (`EXTRACT(ISODOW FROM date)`). | P1 |
| Q4 | `mode` / `mode_preference` values? | `'online'` \| `'library'`. | P1 |
| Q5 | Attendance status for streaks? | Count only `'present'`. | P1 |
| Q6 | Membership `role` values? | `'admin'` (creator) and `'member'`. | P1 |
| Q7 | Find-3 group size: requester + 3 others, or 3 total? | **Requester + `p_count` others** (`p_count` default 3 → `max_size` 4). Extra parameter `p_count` already on `fn_find_three`. | Team |
| Q8 | Exclude students already in a **group for this subject** from match? | **Yes.** They are not candidates. They can still match on other subjects. | Team |
| Q9 | Overlap normalization denominator? | `overlap_minutes / requester_weekly_available_minutes`, capped at 1.0. | P2 (tunable) |
| Q10 | Session `duration` type? | `INTERVAL` (e.g. `90 minutes`). | P1 |
| Q11 | Where is P4 bulk generator output for Task 8? | Not available. Do not fabricate EXPLAIN numbers. | P4 |
| Q12 | PostgreSQL on this machine? | Not installed (`psql` missing, no Homebrew). Local verify blocked until Postgres is installed. | P2 |

## Repo inspection (2026-10-24)

Empty git repo at `/Users/aanyakumar/study-buddy`: no `schema.sql`, no `seed.sql`, no backend, no frontend. P2 is building against the brief’s draft entities only.
