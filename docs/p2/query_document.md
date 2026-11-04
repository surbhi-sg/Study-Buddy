# Query document (P2)

## Task 1 — `fn_match_candidates`

**Purpose.** Rank other students who study the same subject so the UI can show “why we matched you” (overlap, skill, mode) before Find-3 creates a group.

**DBMS concepts.** CTEs, interval intersection with `GREATEST`/`LEAST`, a single-row weights view (tunable constants without rewriting the function), deterministic `ORDER BY`.

**SQL.** See `db/p2/queries.sql` and `db/p2/views.sql`.

**Expected sample (fixture `db/p2/tests/task1_fixture.sql`, requester student_id=1, subject_id=1, limit=20).**

| candidate_id | candidate_name | total_score | subject_score | overlap_minutes | overlap_score | skill_score | mode_score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Bina | 1.0000 | 1.0000 | 120 | 1.0000 | 1.0000 | 1.0000 |
| 7 | Gita | 0.7500 | 1.0000 | 60 | 0.5000 | 1.0000 | 1.0000 |
| 3 | Chetan | 0.4000 | 1.0000 | 60 | 0.5000 | 0.5000 | 0.0000 |
| 4 | Diya | 0.3000 | 1.0000 | 0 | 0.0000 | 1.0000 | 0.0000 |
| 8 | Hari | 0.3000 | 1.0000 | 0 | 0.0000 | 1.0000 | 0.0000 |

Student 5 is excluded (already in a DBMS group). Student 6 is excluded (not enrolled).

**How to run (once PostgreSQL exists):**

```bash
createdb studybuddy
psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/_p1_draft_schema.sql
psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/install_p2.sql
psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/tests/task1_fixture.sql
psql -v ON_ERROR_STOP=1 -d studybuddy -c "SELECT * FROM fn_match_candidates(1, 1, 20);"
psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/tests/p2_tests.sql
```

**Verification status:** SQL authored; **not executed**. This machine has no `psql` / PostgreSQL. Do not treat the table above as live `\g` output until Task 1 is re-run on Postgres.
