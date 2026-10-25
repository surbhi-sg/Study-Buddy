# Cursor Prompt: P2 (Query and Logic Engineer), Study Buddy DBMS Project

Paste everything below the line into Cursor (Agent mode). Save it as `/docs/P2_PROMPT.md` in the repo, or as `.cursor/rules/p2.mdc`, so it persists across chats.

---

## ROLE AND CONTEXT

You are helping me, **P2 (Query and Logic Engineer)**, on a 4-person DBMS course project called **Study Buddy**. Students pick subjects, skill levels, availability slots and a mode (online or library). The system computes match scores, forms study groups, schedules sessions, tracks attendance and streaks, and collects feedback. The headline feature is **"Find 3 people for tomorrow's revision"**: one click finds the 3 best-matched free students for a subject and creates the group safely, even when many users click at once.

Team split:
- **P1:** ER model, normalization theory, `schema.sql` (owns the schema, versioned `schema_v1.sql`, `schema_v2.sql`, with a changelog).
- **P2 (me):** everything the database computes, plus performance.
- **P3:** backend/API (FastAPI/Flask/Express). Calls my SQL objects; never rewrites my SQL.
- **P4:** frontend, `seed.sql`, bulk data generator, testing, report.

Stack: **PostgreSQL** (use window functions, CTEs, `FOR UPDATE SKIP LOCKED`, `EXPLAIN (ANALYZE, BUFFERS)`, PL/pgSQL). Repo folders: `/db`, `/backend`, `/frontend`, `/docs`.

## OWNERSHIP RULES (critical for integration)

1. I only create or edit files in `/db/p2/` and `/docs/p2/`. Never edit `schema*.sql`, `seed.sql`, anything in `/backend` or `/frontend`. If something in the schema must change, write the request into `/docs/p2/schema_requests.md` (what, why, exact DDL proposed) so I can send it to P1.
2. Read the current P1 schema from `/db/schema.sql` (or the latest `schema_vN.sql`) before writing anything. If it does not exist yet, build against the draft entities below and keep **all table and column names in one place** (`/db/p2/naming_map.md`) so renaming later is a quick find-and-replace.
3. Every callable object has a **stable name, signature and output columns** documented in `/docs/p2/interface.md`. Once P3 has the interface, signature changes are announced and versioned, never silent.
4. Everything must be **re-runnable**: use `CREATE OR REPLACE`, `DROP ... IF EXISTS`, and a `/db/p2/install_p2.sql` that runs all P2 files in the right order (`views`, `functions/queries`, `triggers`, `indexes`) on a database that already has P1's schema loaded.
5. No hardcoded IDs, no `SELECT *` in views or functions, no dependency on seed data inside functions or views.

## DRAFT DATA MODEL (until P1 freezes)

Student(student_id, name, email, password_hash, year, branch)
Subject(subject_id, name)
StudentSubject(student_id, subject_id, skill_level)
Availability(student_id, day_of_week, start_time, end_time, mode_preference)
StudyGroup(group_id, subject_id, mode, max_size, created_by, created_at)
Membership(student_id, group_id, role, joined_at)
Session(session_id, group_id, start_datetime, duration, location_or_link)
Attendance(session_id, student_id, status)
Feedback(session_id, student_id, rating, comment)

Streaks and match scores are **derived**, never stored as base columns.

## DELIVERABLES (files to create)

```
/db/p2/
  install_p2.sql        # runs everything below in order
  views.sql
  queries.sql           # match, find-3 function, streak, reports
  triggers.sql
  indexes.sql           # created AFTER baseline EXPLAIN is recorded
  concurrency_demo/     # two-session demo (script + README)
  tests/p2_tests.sql    # expected-vs-actual checks
  optimization/         # baseline and after plans, timings, gen script usage
/docs/p2/
  interface.md          # contract for P3 and P4
  query_document.md     # purpose, SQL, sample output, concept per query
  optimization_report.md
  schema_requests.md
  open_questions.md
  report_chapters.md    # text for the "Queries/Views/Triggers/Transaction" and "Optimization" chapters
```

## TASKS (do in this order; finish and verify each before the next)

### Task 1: Match-score function
`fn_match_candidates(p_student_id INT, p_subject_id INT, p_limit INT DEFAULT 20)` returns a table:
`candidate_id, candidate_name, total_score, subject_score, overlap_minutes, overlap_score, skill_score, mode_score`.

- Candidates: students who also study `p_subject_id`, excluding the requester, and (document the choice) excluding students already in a group for that subject.
- Score = weighted sum, weights defined in ONE place (a small `match_weights` view or constants in the function), documented with reasoning. Suggested: same subject (gate, not weighted), overlapping availability minutes (weight 0.5, normalized), skill closeness `1 - abs(diff)/max_range` (0.3), same mode preference (0.2). Make the weights easy to tune.
- Overlap = sum of time intersection between requester's and candidate's availability on the same `day_of_week` (`GREATEST(start)`, `LEAST(end)`, only positive).
- Return the score breakdown so the frontend can show WHY it matched. Deterministic tie-break (higher score, then lower student_id).

### Task 2: "Find 3 people" transaction (most important)
`fn_find_three(p_requester_id INT, p_subject_id INT, p_date DATE, p_mode TEXT DEFAULT NULL, p_count INT DEFAULT 3)` returning one row: `status TEXT, group_id INT, session_id INT, members JSONB`.

Behaviour:
- "Free" = has availability covering that date's day_of_week, is not already in an overlapping session that day, and has no pending membership conflict. Document the exact definition.
- Pick the top `p_count` candidates by match score (reuse Task 1 logic, do not duplicate it).
- Create `StudyGroup`, insert `Membership` rows (requester as creator/admin, the others as members), and create the `Session` at the best common slot. All in ONE transaction (the function body is atomic).
- **Concurrency:** lock candidate student rows with `SELECT ... FOR UPDATE SKIP LOCKED` (rank in a CTE first, because locking clauses cannot be used with window functions or aggregates, then lock the chosen ids in a deterministic order, ordered by student_id, to avoid deadlocks). After locking, **re-check** that each is still free (the world may have changed between ranking and locking). If a locked candidate is no longer free, replace them with the next-ranked one. Consider `pg_advisory_xact_lock(subject_id, date)` as an alternative and document why you chose one.
- **Fewer than `p_count` available:** decision for this project: **create nothing, roll back, return `status = 'INSUFFICIENT'`** with the candidates found in `members` so P4 can show "only N found". Statuses: `'CREATED'`, `'INSUFFICIENT'`, `'ALREADY_BUSY'` (requester conflict). Write this in `interface.md`.
- Open question to log in `open_questions.md` and confirm with the team: is the group the requester + 3 others (max_size 4) or 3 total? Default to **requester + 3 others** until told otherwise, and make it a parameter.
- Write `concurrency_demo/`: two `psql` sessions (or a Python script using two threads/connections) calling `fn_find_three` at the same moment for overlapping candidate pools. Show output proving **no student is assigned to two groups**. Include a README with the exact commands, and also a variant that deliberately breaks it (no locking) to show the double-booking, for the viva.

### Task 3: Streak
- View `v_student_streak(student_id, current_streak, longest_streak, last_attended_date)` using gaps-and-islands (`date - ROW_NUMBER()` grouping over distinct attended dates). "Current" streak = island that ends today or yesterday; otherwise 0. Count only `status = 'present'` (match whatever P1's attendance enum is).

### Task 4: Triggers and constraints (in `triggers.sql`)
Use `RAISE EXCEPTION ... USING ERRCODE = '...'` with these **custom SQLSTATE codes** so P3 can map them to HTTP errors without parsing text:
- `SB001`: group full (members would exceed `max_size`)
- `SB002`: duplicate membership
- `SB003`: overlapping session for a student
- `SB004`: feedback only allowed for sessions the student attended
- `SB005`: other business-rule violation (documented per use)
Add concurrency-safe capacity enforcement (lock the group row `FOR UPDATE` in the trigger before counting). Document each code in `interface.md`.

### Task 5: Views (`views.sql`)
- `v_student_dashboard(student_id, upcoming_sessions JSONB, groups JSONB, current_streak, longest_streak)` or split into clearly named simpler views if JSON aggregation gets heavy.
- `v_group_summary(group_id, subject_name, mode, member_count, max_size, next_session, avg_rating)`.
Keep column names stable; they are P3's contract.

### Task 6: Reporting queries
Most active groups, average feedback per subject, longest streaks, subjects with most unmatched demand (students wanting a subject with no group/with unfilled groups). Each as a view or function with documented columns.

### Task 7: Tests on seed data
Write `tests/p2_tests.sql`: for every query/function, put the **expected output** next to it and an assertion (`DO $$ ... ASSERT ... $$`). Test the edge cases P4 is seeding: a student with no availability, a full group, a broken streak, a subject with fewer than 3 candidates. Report mismatches to P4 or fix my logic.

### Task 8: Optimization (mandatory, record before touching indexes)
1. Load the P4 bulk generator output (several thousand+ rows; ask me for the file location, never fabricate it).
2. Baseline: `EXPLAIN (ANALYZE, BUFFERS)` for the match query and the streak query with NO new indexes. Save full plans to `optimization/baseline_*.txt`.
3. Add targeted indexes in `indexes.sql` (candidates: `StudentSubject(subject_id, student_id)`, `Availability(student_id, day_of_week, start_time, end_time)`, `Session(group_id, start_datetime)`, `Attendance(student_id, session_id)` with a partial index for present, `Membership(group_id)`), re-run, save `after_*.txt`.
4. Rewrite at least one query two ways (correlated subquery vs join, or CTE vs derived table), and report which is faster and why.
5. Document one deliberate trade-off (cached `member_count` on StudyGroup vs computing it), including its consistency cost, and how a trigger would keep it right.
6. Fill `optimization_report.md` with a before/after table (plan node types, rows, ms) and a one-paragraph conclusion per index. Never invent numbers; use real output only.

### Task 9: Documents
- `interface.md`: for each object: name, parameters (types and defaults), output columns (types), error codes, an example call, and which API endpoint P3 will map it to. P3 needs this first, so produce a draft right after Task 1's signature is set, before the bodies are finished.
- `query_document.md`: per query: purpose, SQL, sample output, concept per query, DBMS concept demonstrated (window functions, CTEs, locking, isolation, etc.).
- `report_chapters.md`: report-ready prose for P4.

## INTEGRATION CHECKLIST (verify at the end of each task)

- [ ] `install_p2.sql` runs cleanly on a fresh DB with the current P1 schema (test with `psql -v ON_ERROR_STOP=1 -f`).
- [ ] Runs again with no errors (idempotent).
- [ ] No P2 object references a column that does not exist in the latest schema.
- [ ] `interface.md` matches the actual signatures (generate it by inspecting `\df` and `\d+` output, not from memory).
- [ ] Every error path raises a documented SQLSTATE.
- [ ] Functions are callable with plain parameters only (no psql-only features), so P3 can use parameterized `SELECT * FROM fn_x($1, $2, $3)`.
- [ ] Output column names are snake_case, stable, and typed.
- [ ] Tests pass against P4's `seed.sql`.

## WORKING STYLE

- Work one task at a time. At the end of each, show me: files changed, how to run it, a sample result, and any assumption you made.
- If something is ambiguous (schema name, enum values, group-size meaning), do NOT guess silently: write it in `open_questions.md`, pick a documented default, and tell me.
- Use `psql` locally to actually run what you write. Show real output. Do not claim something works without running it.
- Keep SQL readable: CTEs with meaningful names, comments explaining the concept, consistent formatting.
- Commit small and often on branch `p2/<task>`; commit messages like `p2: add fn_match_candidates with score breakdown`. Do not merge to main unless it runs end to end.
- Remember I must explain every line in the viva: after each task, give me a 5-line plain-English explanation and 2 likely examiner questions with answers.

Start by: (1) inspecting the repo for the latest schema and any P3/P4 files, (2) listing the assumptions you will make, (3) creating `/docs/p2/interface.md` with draft signatures for the objects above, then proceed with Task 1.
