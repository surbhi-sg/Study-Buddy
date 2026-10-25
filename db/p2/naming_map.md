# P2 naming map (draft until P1 freezes)

P1 has not shipped `/db/schema.sql` yet. P2 SQL uses **unquoted snake_case** PostgreSQL identifiers. When P1 freezes names, update this table and find-and-replace in `/db/p2/`.

| Draft entity (brief) | P2 table | Columns (P2 types) |
| --- | --- | --- |
| Student | `student` | `student_id INT PK`, `name TEXT`, `email TEXT`, `password_hash TEXT`, `year SMALLINT`, `branch TEXT` |
| Subject | `subject` | `subject_id INT PK`, `name TEXT` |
| StudentSubject | `student_subject` | `student_id INT`, `subject_id INT`, `skill_level SMALLINT` (1–5) |
| Availability | `availability` | `student_id INT`, `day_of_week SMALLINT` (ISO 1=Mon … 7=Sun), `start_time TIME`, `end_time TIME`, `mode_preference TEXT` (`online` \| `library`) |
| StudyGroup | `study_group` | `group_id INT PK`, `subject_id INT`, `mode TEXT` (`online` \| `library`), `max_size INT`, `created_by INT`, `created_at TIMESTAMPTZ` |
| Membership | `membership` | `student_id INT`, `group_id INT`, `role TEXT` (`admin` \| `member`), `joined_at TIMESTAMPTZ` |
| Session | `session` | `session_id INT PK`, `group_id INT`, `start_datetime TIMESTAMPTZ`, `duration INTERVAL`, `location_or_link TEXT` |
| Attendance | `attendance` | `session_id INT`, `student_id INT`, `status TEXT` (`present` \| `absent` \| `excused`) |
| Feedback | `feedback` | `session_id INT`, `student_id INT`, `rating SMALLINT` (1–5), `comment TEXT` |

Derived (never stored as base columns): match scores, streaks, `member_count`, dashboard JSON.

Local-only stand-in schema for P2 development: `db/p2/_p1_draft_schema.sql`. P1 owns the real schema; do not copy this file to `/db/schema.sql`.
