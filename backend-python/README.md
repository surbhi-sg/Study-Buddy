# Study Buddy backend (Python + Flask, for XAMPP)

The same API as the Node backend in `../backend`, written in Python. The React frontend works with
either one without changes, because both run on port 3000. **Run only one of them at a time.**

| File | What it does |
|---|---|
| `setup_db.py` | Creates the `studybuddy` database on XAMPP and loads `../schema.sql` and `../db/seed.sql` |
| `app.py` | Starts the API on http://localhost:3000 |
| `config.py` | Database and login settings (defaults match a fresh XAMPP: root, no password) |
| `db.py` | PyMySQL connection per request; `transaction()` for COMMIT/ROLLBACK |
| `errors.py` | Turns database errors into `{"error": ..., "code": ...}` JSON |
| `queries.py` | Shared SQL: group summary, a student's sessions, the streak (CTE + ROW_NUMBER) |
| `routes/auth.py` | Register, login (bcrypt + JWT), `me` |
| `routes/profile.py` | Subjects list, profile, subjects and availability (replaced in one transaction) |
| `routes/dashboard.py` | Streak, upcoming sessions, my groups |
| `routes/groups.py` | Browse, group detail, join (locks the group row: no over-full groups), leave |
| `routes/match.py` | Match suggestions with the score breakdown, and the group-study transaction |
| `routes/sessions.py` | Calendar, attendance, feedback |

All SQL uses `%s` placeholders (never string formatting), so it is safe from SQL injection.

Full setup steps: `../docs/XAMPP_SETUP.md`.
