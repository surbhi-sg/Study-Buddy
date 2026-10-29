# Study Buddy

DBMS course project: students find people to study a subject with. Pick a subject and a day, get the best-matched
free students (match score from time overlap, skill, mode and ratings), and form a study group of up to 4.
Groups hold sessions; attendance builds a daily streak; members rate sessions.

**Setup: see [docs/SETUP.md](docs/SETUP.md).**

| Folder / file | What | Owner |
|---|---|---|
| `schema.sql` | 9 tables (BCNF/4NF), constraints, availability triggers | P1 |
| `db/triggers.sql`, `views.sql`, `procedures.sql`, `indexes.sql`, `queries.sql`, `concurrency_demo.js` | Business-rule triggers, streak and summary views, matching and group-creation transaction, indexes, reports | P2 |
| `backend/` | Express API, JWT auth ([API list](backend/README.md)) | P3 |
| `frontend/` | React + Vite + Tailwind app | P4 |
| `db/generate_seed.py`, `db/seed.sql`, `db/reset.sql`, `docs/` | Demo data, one-command reset, setup guide | P4 |

Team: Aahana Srivastava, Aanya Kumar, Ishit Ninawat, Surbhi Goyal.
