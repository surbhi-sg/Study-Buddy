# Schema requests for P1

P2 has not edited `/db/schema.sql`. Until P1 ships it, local development uses `db/p2/_p1_draft_schema.sql` (P2-owned stand-in only).

## Request 1 — Base tables matching the brief

**Why:** Match, find-3, streaks, triggers, and views need these relations. Types below are the defaults P2 compiled against (`naming_map.md`).

**Proposed DDL (for P1 to own and adjust):** see `db/p2/_p1_draft_schema.sql`.

Please confirm or replace:

- Unquoted snake_case table names.
- `skill_level SMALLINT CHECK (BETWEEN 1 AND 5)`.
- `day_of_week SMALLINT CHECK (BETWEEN 1 AND 7)` ISO.
- `mode` / `mode_preference TEXT CHECK IN ('online','library')`.
- `attendance.status TEXT CHECK IN ('present','absent','excused')`.
- `membership.role TEXT CHECK IN ('admin','member')`.
- Unique `(student_id, group_id)` on membership.
- Unique `(session_id, student_id)` on attendance and feedback.

## Request 2 — Optional later (do not add yet)

Cached `study_group.member_count` would speed dashboards but needs a trigger to stay consistent. Documented as a Task 8 trade-off; **not requested until P1 agrees**.
