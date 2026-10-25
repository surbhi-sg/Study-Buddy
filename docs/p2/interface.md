# P2 ↔ P3/P4 interface (draft v0.1)

Signature changes after P3 consumes this file must be versioned (v0.2, …), never silent.

Convention: P3 calls `SELECT * FROM fn_x($1, $2, …)` with bound parameters only. Custom SQLSTATE values are five characters (`SB001`–`SB005`).

---

## Error codes (all tasks)

| SQLSTATE | Meaning | Typical HTTP |
| --- | --- | --- |
| `SB001` | Group full (insert would exceed `max_size`) | 409 |
| `SB002` | Duplicate membership | 409 |
| `SB003` | Student already has an overlapping session | 409 |
| `SB004` | Feedback only if the student attended (`present`) | 403 |
| `SB005` | Other documented business-rule violation | 400 |

---

## `v_match_weights` (Task 1, implemented)

Single-row view. Tune weights here; `fn_match_candidates` reads them.

| Column | Type | Meaning |
| --- | --- | --- |
| `w_overlap` | `NUMERIC(4,2)` | Weight for normalized overlap (default 0.50) |
| `w_skill` | `NUMERIC(4,2)` | Weight for skill closeness (default 0.30) |
| `w_mode` | `NUMERIC(4,2)` | Weight for same-mode overlap (default 0.20) |
| `skill_min` | `SMALLINT` | Lowest skill (default 1) |
| `skill_max` | `SMALLINT` | Highest skill (default 5) |

Reasoning: same-subject is a **gate** (you cannot match unless both study the subject), so it is not a weight. Remaining 1.00 is split toward the headline “find people who can actually sit together” (overlap 0.50), then skill closeness (0.30), then mode (0.20).

---

## `fn_match_candidates` (Task 1, implemented)

```
fn_match_candidates(p_student_id INT, p_subject_id INT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  candidate_id     INT,
  candidate_name   TEXT,
  total_score      NUMERIC,
  subject_score    NUMERIC,
  overlap_minutes  INT,
  overlap_score    NUMERIC,
  skill_score      NUMERIC,
  mode_score       NUMERIC
)
```

**Candidate rule:** other students in `student_subject` for `p_subject_id`, **excluding** anyone who already has a `membership` in a `study_group` for that same subject (open question Q8).

**Scoring:**

- `subject_score` = 1.0 for every returned row (gate already applied).
- `overlap_minutes` = sum of positive intersections on the same `day_of_week`: `GREATEST(0, LEAST(end) - GREATEST(start))` in minutes.
- `overlap_score` = `LEAST(1, overlap_minutes / requester_total_available_minutes)`.
- `skill_score` = `1 - abs(skill_requester - skill_candidate) / (skill_max - skill_min)`.
- `mode_score` = matching-mode overlap minutes / overlap minutes (0 if no overlap).
- `total_score` = `w_overlap*overlap_score + w_skill*skill_score + w_mode*mode_score`.
- Order: `total_score DESC`, `candidate_id ASC`. Limit `p_limit`.

**Empty result:** requester not enrolled in the subject, or no other eligible students.

Example:

```sql
SELECT * FROM fn_match_candidates($1, $2, $3);
-- e.g. fn_match_candidates(1, 10, 20);
```

Suggested P3 endpoint: `GET /students/{id}/subjects/{subject_id}/matches?limit=20`.

---

## `fn_find_three` (Task 2, signature frozen; body later)

```
fn_find_three(
  p_requester_id INT,
  p_subject_id   INT,
  p_date         DATE,
  p_mode         TEXT DEFAULT NULL,
  p_count        INT  DEFAULT 3
)
RETURNS TABLE (
  status     TEXT,
  group_id   INT,
  session_id INT,
  members    JSONB
)
```

Statuses: `'CREATED'` | `'INSUFFICIENT'` | `'ALREADY_BUSY'`.

- Group = requester + `p_count` others (`max_size = p_count + 1`).
- `'INSUFFICIENT'`: create nothing; `members` lists whoever was still free; `group_id`/`session_id` NULL.
- `'ALREADY_BUSY'`: requester not free that day.

Suggested P3 endpoint: `POST /groups/find-three`.

---

## `v_student_streak` (Task 3, draft)

| Column | Type |
| --- | --- |
| `student_id` | `INT` |
| `current_streak` | `INT` |
| `longest_streak` | `INT` |
| `last_attended_date` | `DATE` |

Present-only, gaps-and-islands. Suggested: `GET /students/{id}/streak`.

---

## Triggers (Task 4, draft)

Fired on `membership`, `session`/`attendance`, `feedback`. Raise `SB001`–`SB005` as in the table above. Capacity lock: `SELECT … FROM study_group WHERE group_id = NEW.group_id FOR UPDATE`.

---

## `v_student_dashboard` (Task 5, draft)

| Column | Type |
| --- | --- |
| `student_id` | `INT` |
| `upcoming_sessions` | `JSONB` |
| `groups` | `JSONB` |
| `current_streak` | `INT` |
| `longest_streak` | `INT` |

Suggested: `GET /students/{id}/dashboard`.

## `v_group_summary` (Task 5, draft)

| Column | Type |
| --- | --- |
| `group_id` | `INT` |
| `subject_name` | `TEXT` |
| `mode` | `TEXT` |
| `member_count` | `INT` |
| `max_size` | `INT` |
| `next_session` | `TIMESTAMPTZ` |
| `avg_rating` | `NUMERIC` |

Suggested: `GET /groups/{id}`.

---

## Reporting views (Task 6, draft)

| Object | Columns | Suggested endpoint |
| --- | --- | --- |
| `v_most_active_groups` | `group_id INT`, `subject_name TEXT`, `session_count INT` | `GET /reports/active-groups` |
| `v_avg_feedback_per_subject` | `subject_id INT`, `subject_name TEXT`, `avg_rating NUMERIC`, `feedback_count INT` | `GET /reports/feedback` |
| `v_longest_streaks` | `student_id INT`, `student_name TEXT`, `longest_streak INT` | `GET /reports/streaks` |
| `v_unmatched_demand` | `subject_id INT`, `subject_name TEXT`, `students_wanting INT`, `open_seats INT` | `GET /reports/demand` |

---

## Versioning

| Version | Date | Change |
| --- | --- | --- |
| v0.1 | 2026-10-24 | Draft all signatures; implement Task 1 match objects |
