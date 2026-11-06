# Running Study Buddy on XAMPP + Python (Windows)

You need: **XAMPP** (for MySQL/MariaDB), **Python 3.10 or newer**, and **Node.js** (only to show the React web pages).
Run all commands from the `Study-Buddy` folder in VS Code's terminal (PowerShell) unless a step says otherwise.

## 1. Start MySQL in XAMPP

1. Install XAMPP from https://www.apachefriends.org (the default options are fine).
2. Open the **XAMPP Control Panel** and click **Start** next to **MySQL**. It turns green.
3. Optional: also start **Apache** to browse the tables at http://localhost/phpmyadmin.

If MySQL will not start and says port 3306 is in use, another MySQL is already running (for example the
MySQL 8.4 service installed earlier). Stop it: Start menu, search **Services**, find **MySQL84** (or MySQL80),
right-click, **Stop**, and set Startup type to **Manual**. Then click Start in XAMPP again.

## 2. Install the Python packages (once)

```
cd backend-python
pip install -r requirements.txt
```

If `pip` is not recognized, use `py -m pip install -r requirements.txt`.
If Python is not installed: get it from https://www.python.org/downloads and tick **"Add python.exe to PATH"** in the installer.

## 3. Create the database with demo data

Still in `backend-python`:

```
python setup_db.py
```

Expected ending: `studybuddy is ready: 42 students, 13 groups, 50 sessions.`
Run it again before every demo to reset the data (dates are relative to today).

If your XAMPP root user has a password, set it first: `$env:DB_PASSWORD = "yourpassword"`.

## 4. Start the Python backend (Terminal 1)

```
python app.py
```

It prints `Study Buddy API on http://localhost:3000`. Check http://localhost:3000/api/health shows `"db": "connected"`.
Leave this terminal running.

## 5. Start the web pages (Terminal 2)

Click **+** in the VS Code terminal panel, then from the `Study-Buddy` folder:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in.

| Email | Password | Shows |
|---|---|---|
| riya@studybuddy.test | password123 | Main demo: 7-day streak, 2 groups, Find group works for any date |
| aman@studybuddy.test | password123 | Broken streak (0 now, best 4) |
| zoya@studybuddy.test | password123 | No free time set: Find group explains what to do |

Demo ideas: Find group, Mathematics, tomorrow (suggested group of up to 4 who share a free time);
Compiler Design (only one partner); Browse groups, OS Deadlock Busters (full, 4/4).

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to MySQL at 127.0.0.1:3306` | MySQL is not started in the XAMPP Control Panel |
| `Access denied for user 'root'` | Your root user has a password: `$env:DB_PASSWORD = "..."`, then run again (same terminal) |
| `No module named 'flask'` (or pymysql, bcrypt, jwt) | Step 2 was not done, or was done with a different Python. Use `python -m pip install -r requirements.txt` |
| App says "Cannot reach the server" | Terminal 1 (`python app.py`) is not running |
| `Address already in use` on port 3000 | The Node backend (or another `app.py`) is still running. Close that terminal |
| `npm` not recognized | Install Node.js LTS from https://nodejs.org, then reopen VS Code |
