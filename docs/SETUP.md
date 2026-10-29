# Study Buddy: setup guide

Runs on any laptop with **MySQL 8.0.16+**, **Node.js 20+** and **Python 3** (Python is only needed to regenerate seed data).
Commands work in Windows PowerShell, cmd, and Mac/Linux terminals. Run them from the repo root (`Study-Buddy`) unless a step says otherwise.

## 1. Create the database user (once)

Open the MySQL client as root (`mysql -u root -p`, or MySQL Workbench) and run:

```sql
CREATE USER IF NOT EXISTS 'sb_user'@'localhost' IDENTIFIED BY 'tiger';
GRANT ALL ON studybuddy.* TO 'sb_user'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;   -- lets the triggers/procedures load
```

If `mysql` is "not recognized" on Windows, use its full path, e.g.
`& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p`.

## 2. Build (or reset) the database

From the repo root:

```
mysql -u root -p -e "source db/reset.sql"
```

This drops and recreates `studybuddy`, then loads, in order:
`schema.sql` (P1) → `db/triggers.sql`, `db/views.sql`, `db/procedures.sql`, `db/indexes.sql` (P2) → `db/seed.sql` (P4).
It ends by printing `studybuddy is ready` with row counts. **Run it before every demo and rehearsal.**

## 3. Start the backend (port 3000)

```
cd backend
npm install
copy .env.example .env        (Mac/Linux: cp .env.example .env)
npm run dev
```

Edit `backend/.env` if your MySQL password differs, and set any long `JWT_SECRET`.
Check http://localhost:3000/api/health → `{"status":"ok","db":"connected"}`.

## 4. Start the frontend (port 5173), in a second terminal

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend forwards every `/api/...` call to port 3000 (`vite.config.js`).

## 5. Log in with the demo accounts

Password for every seeded account: **password123**

| Email | Shows |
|---|---|
| riya@studybuddy.test | Main demo: 7-day streak, 2 groups, free every evening so **Find group** works for any date |
| aman@studybuddy.test | Broken streak (0 now, best 4) |
| zoya@studybuddy.test | No free time: Find group explains how to add availability |

Good demo moments: Find group → Mathematics → tomorrow (suggested group of 3, swap people, create);
Compiler Design (only one partner, smaller group); Browse groups → OS Deadlock Busters (full, 4/4).

## 6. P2's extras

- Concurrency demo (two people booking the same student at the same moment):
  `node db/concurrency_demo.js`, run from the repo root with the backend's `npm install` done. Expected: exactly one succeeds every round.
- Optimization data: `python db/generate_seed.py --bulk 5000`, then load `db/seed_bulk.sql` instead of `seed.sql`.
- Example and reporting queries: `db/queries.sql`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot reach the server` in the app | Backend isn't running, or not on port 3000 |
| `Access denied for user 'sb_user'` | Step 1 not done, or `backend/.env` password wrong |
| `This function has none of DETERMINISTIC...` while loading | Run the `SET GLOBAL log_bin_trust_function_creators = 1;` line from step 1 |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` missing in `backend/.env` |
| `Failed to open file 'schema.sql'` | Run step 2 from the repo root, not from `db/` |
| Streak or "upcoming" looks wrong | Reset the database (step 2); seed dates are relative to today |
