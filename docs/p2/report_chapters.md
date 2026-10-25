# Report chapters (P2 draft, fill after objects exist)

## Queries, views, triggers, and transactions

Study Buddy keeps match scores and streaks as derived results, not stored columns, so they cannot drift from attendance or availability. Task 1 exposes `fn_match_candidates`, which gates on a shared subject, then scores overlapping weekly minutes, skill closeness, and mode agreement using weights in `v_match_weights`. Later chapters will describe `fn_find_three` as a single PL/pgSQL transaction that ranks, locks with `FOR UPDATE SKIP LOCKED`, re-checks free-ness, and either creates a group or returns `INSUFFICIENT` without writing rows.

## Optimization

Not written yet. After Task 8, this section will quote real plan node types, row counts, and timings from `db/p2/optimization/`, plus the member_count caching trade-off.
