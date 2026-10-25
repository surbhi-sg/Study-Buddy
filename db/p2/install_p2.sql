-- Install P2 objects on a database that already has P1's schema
-- (or db/p2/_p1_draft_schema.sql during local development).
-- Idempotent: safe to re-run.
-- Usage: psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/install_p2.sql

\echo 'P2 install: views'
\ir views.sql

\echo 'P2 install: functions'
\ir queries.sql

\echo 'P2 install: triggers'
\ir triggers.sql

\echo 'P2 install: indexes (none until Task 8 baseline)'
\ir indexes.sql

\echo 'P2 install: done'
