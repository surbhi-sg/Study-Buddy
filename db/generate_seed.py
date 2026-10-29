"""
Study Buddy | generate_seed.py | Owner: P4
Writes db/seed.sql (demo data) or a bulk file for P2's EXPLAIN tests.

    python db/generate_seed.py                    -> db/seed.sql (about 40 students)
    python db/generate_seed.py --bulk 5000        -> db/seed_bulk.sql (5000 students)

No extra packages needed (standard library only). Output is deterministic
(fixed random seed), so everyone gets the same data.

All dates are written RELATIVE to "today" in SQL (for example "3 days ago"),
so streaks and upcoming sessions are always correct whenever you reload it.

Demo logins (password for every account: password123)
  riya@studybuddy.test   main demo user: 7-day streak, in 2 groups,
                         free every evening, so "Find a group" works any day
  aman@studybuddy.test   broken streak (studied 4 days in a row, then stopped)
  zoya@studybuddy.test   no availability at all (empty states)
Edge cases (P1 pack 11.4): a full group (OS Deadlock Busters, 4/4),
a subject with too few partners (Compiler Design).
"""
import argparse
import os
import random

PASSWORD_HASH = "$2b$10$ZADasZ2ehdT6YN255iWuEe0T6l1RKAbhTVjgSpM.0Is7TDOmGNy.6"  # bcrypt("password123")

SUBJECTS = ["Mathematics", "DBMS", "Operating Systems", "Computer Networks",
            "DSA", "Discrete Structures", "Compiler Design"]
SUB_ID = {name: i + 1 for i, name in enumerate(SUBJECTS)}

FIRST = ["Aarav", "Neha", "Kabir", "Ishita", "Vihaan", "Ananya", "Arjun", "Diya", "Reyansh", "Saanvi",
         "Advik", "Myra", "Kiaan", "Anika", "Dhruv", "Tara", "Rohan", "Meera", "Aditya", "Pari",
         "Yash", "Kavya", "Laksh", "Riddhi", "Sahil", "Nisha", "Om", "Simran", "Parth", "Tanvi",
         "Rudra", "Isha", "Veer", "Aditi", "Karan", "Jiya", "Manav", "Sara", "Nikhil", "Pooja"]
LAST = ["Mehta", "Gupta", "Singh", "Rao", "Kapoor", "Iyer", "Nair", "Joshi", "Malhotra", "Reddy",
        "Chopra", "Bose", "Das", "Pillai", "Agarwal", "Bhatt", "Saxena", "Kulkarni", "Menon", "Shah"]
BRANCHES = ["CSE", "IT", "ECE", "CSAI", "CSDS", "MAC"]
MODES = ["online", "library", "either"]


def q(s):
    """SQL string literal."""
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def ist(day_offset, hhmm):
    """Local (IST) time `day_offset` days from today, converted to UTC for storage."""
    return f"CONVERT_TZ(TIMESTAMP(@today + INTERVAL {day_offset} DAY, '{hhmm}:00'), '+05:30', '+00:00')"


def to_min(hhmm):
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and b_start < a_end


class Data:
    def __init__(self):
        self.students = []        # (id, name, email, year, branch)
        self.student_subject = [] # (sid, subj, skill)
        self.slots = {}           # sid -> list of (dow, start, end, mode)
        self.groups = []          # (gid, subj, name, mode, max_size, creator)
        self.members = []         # (sid, gid, role)
        self.sessions = []        # (session_id, gid, day_offset, hhmm, minutes, location)
        self.attendance = []      # (session_id, sid, status)
        self.feedback = []        # (session_id, sid, rating, comment)
        self.busy = {}            # sid -> list of (day_offset, start_min, end_min)

    def add_slot(self, sid, dow, start, end, mode):
        """Add an availability slot unless it overlaps one the student already has that day."""
        for d, s, e, _ in self.slots.setdefault(sid, []):
            if d == dow and overlaps(to_min(s), to_min(e), to_min(start), to_min(end)):
                return False
        self.slots[sid].append((dow, start, end, mode))
        return True

    def can_meet(self, gid, day, hhmm, minutes):
        start = to_min(hhmm)
        for sid, g, _ in self.members:
            if g != gid:
                continue
            for d, s, e in self.busy.get(sid, []):
                if d == day and overlaps(s, e, start, start + minutes):
                    return False
        return True

    def add_session(self, gid, day, hhmm, minutes, location):
        if not self.can_meet(gid, day, hhmm, minutes):
            return None
        sess_id = len(self.sessions) + 1
        self.sessions.append((sess_id, gid, day, hhmm, minutes, location))
        start = to_min(hhmm)
        for sid, g, _ in self.members:
            if g == gid:
                self.busy.setdefault(sid, []).append((day, start, start + minutes))
        return sess_id

    def members_of(self, gid):
        return [sid for sid, g, _ in self.members if g == gid]


def build_demo(rng):
    d = Data()

    # ---------------- students ----------------
    personas = [("Riya Sharma", "riya", 2, "CSE"), ("Aman Verma", "aman", 2, "IT"), ("Zoya Khan", "zoya", 1, "CSE")]
    for i, (name, user, year, branch) in enumerate(personas, start=1):
        d.students.append((i, name, f"{user}@studybuddy.test", year, branch))
    used = {"Riya Sharma", "Aman Verma", "Zoya Khan"}
    while len(d.students) < 42:
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        if name in used:
            continue
        used.add(name)
        sid = len(d.students) + 1
        user = name.lower().replace(" ", ".")
        d.students.append((sid, name, f"{user}@studybuddy.test", rng.randint(1, 4), rng.choice(BRANCHES)))
    RIYA, AMAN, ZOYA = 1, 2, 3
    others = [s[0] for s in d.students if s[0] > 3]

    # ---------------- subjects studied ----------------
    def study(sid, subj, skill):
        d.student_subject.append((sid, SUB_ID[subj], skill))

    for subj, skill in [("Mathematics", 4), ("DBMS", 3), ("Operating Systems", 2), ("Compiler Design", 3)]:
        study(RIYA, subj, skill)
    for subj, skill in [("DBMS", 4), ("DSA", 3)]:
        study(AMAN, subj, skill)
    for subj, skill in [("Mathematics", 2), ("DSA", 2)]:
        study(ZOYA, subj, skill)

    maths_regulars = others[:16]          # plenty of Maths partners for the demo
    for sid in others:
        pool = [s for s in SUBJECTS if s != "Compiler Design"]
        chosen = set(rng.sample(pool, rng.randint(2, 4)))
        if sid in maths_regulars:
            chosen.add("Mathematics")
        for subj in sorted(chosen):
            study(sid, subj, rng.randint(1, 5))
    study(others[20], "Compiler Design", 4)   # only one partner for Riya: shows the "few matches" state

    # ---------------- availability ----------------
    for dow in range(1, 8):                    # Riya: free every evening -> demo works any day
        d.add_slot(RIYA, dow, "16:00", "21:00", "either")
    for dow in (1, 3, 5):
        d.add_slot(AMAN, dow, "18:00", "20:00", "online")
    # Zoya gets no slots on purpose.
    for dow in range(1, 8):                    # the single Compiler Design partner: free most evenings
        d.add_slot(others[20], dow, "19:00", "21:00", "either")

    evening = [("16:00", "18:00"), ("17:00", "19:00"), ("17:30", "19:30"), ("18:00", "20:30"),
               ("19:00", "21:00"), ("16:30", "18:30")]
    for dow in range(1, 8):                    # each day: 6 Maths students free in the evening
        for sid in rng.sample(maths_regulars, 6):
            start, end = rng.choice(evening)
            d.add_slot(sid, dow, start, end, rng.choice(MODES))
    other_windows = [("08:00", "10:00"), ("10:00", "12:00"), ("13:00", "15:00"), ("14:00", "16:00"),
                     ("16:00", "18:00"), ("18:00", "20:00"), ("19:00", "21:00"), ("20:00", "22:00")]
    for sid in others:                         # everyone else: 2-4 random weekly slots
        for _ in range(rng.randint(2, 4)):
            start, end = rng.choice(other_windows)
            d.add_slot(sid, rng.randint(1, 7), start, end, rng.choice(MODES))

    # ---------------- groups (max 4 people) ----------------
    takes = {}
    for sid, subj, _ in d.student_subject:
        takes.setdefault(subj, []).append(sid)

    def make_group(name, subj, mode, creator, members, max_size=4):
        gid = len(d.groups) + 1
        d.groups.append((gid, SUB_ID[subj], name, mode, max_size, creator))
        d.members.append((creator, gid, "admin"))
        for sid in members:
            d.members.append((sid, gid, "member"))
        return gid

    maths_pool = [s for s in takes[SUB_ID["Mathematics"]] if s not in (RIYA, ZOYA)]
    dbms_pool = [s for s in takes[SUB_ID["DBMS"]] if s not in (RIYA, AMAN)]
    g_maths = make_group("Maths Revision Squad", "Mathematics", "library", RIYA, maths_pool[:2])
    g_dbms = make_group("DBMS Night Owls", "DBMS", "online", dbms_pool[0], [RIYA, AMAN])

    os_pool = [s for s in takes[SUB_ID["Operating Systems"]] if s != RIYA]
    g_os_full = make_group("OS Deadlock Busters", "Operating Systems", "online", os_pool[0], os_pool[1:4])

    extra_names = {
        "Mathematics": ["Calculus Crew", "Linear Algebra Lab"],
        "DBMS": ["Normal Form Fanatics", "SQL Sprinters"],
        "Operating Systems": ["Process Schedulers"],
        "Computer Networks": ["Packet Pushers", "Subnet Society"],
        "DSA": ["Graph Gang", "DP Dojo"],
        "Discrete Structures": ["Proof Pals"],
    }
    extra_groups = []
    for subj, names in extra_names.items():
        pool = [s for s in takes[SUB_ID[subj]] if s not in (RIYA, AMAN, ZOYA)]
        for name in names:
            if len(pool) < 2:
                continue
            picked = rng.sample(pool, rng.randint(2, 3))      # 2-3 people: room left to join
            extra_groups.append(make_group(name, subj, rng.choice(["online", "library"]), picked[0], picked[1:]))

    # ---------------- sessions ----------------
    LIB, MEET = "Central Library, Room 2", "https://meet.google.com/sbd-demo-link"
    # Riya's 7-day streak: one attended session on each of the last 7 days
    for day in range(-7, 0):
        if day % 2 == 0:
            d.add_session(g_maths, day, "17:00", 90, LIB)
        else:
            d.add_session(g_dbms, day, "20:00", 60, MEET)
    # Aman's broken streak: 4 days in a row, two weeks ago
    aman_days = set()
    for day in range(-14, -10):
        if d.add_session(g_dbms, day, "20:00", 60, MEET):
            aman_days.add(day)
    # Upcoming for Riya (not tomorrow, so "Find a group for tomorrow" is free)
    d.add_session(g_maths, 2, "17:00", 90, LIB)
    d.add_session(g_dbms, 3, "20:00", 60, MEET)
    d.add_session(g_maths, 6, "17:00", 90, LIB)
    # Other groups: a few past and upcoming sessions each
    for gid in [g_os_full] + extra_groups:
        mode = d.groups[gid - 1][3]
        loc = LIB if mode == "library" else MEET
        for day in rng.sample([-20, -16, -12, -9, -5, -3, 1, 4, 5, 8, 10], 4):
            d.add_session(gid, day, rng.choice(["09:00", "11:00", "14:00", "15:00", "21:00"]), rng.choice([60, 90]), loc)

    # ---------------- attendance and feedback (past sessions only) ----------------
    comments = ["Very productive", "Solved all the PYQs", "Good pace", "Got a bit off topic",
                "Clear explanations", None, None]
    for sess_id, gid, day, _, _, _ in d.sessions:
        if day >= 0:
            continue
        for sid in d.members_of(gid):
            if sid == RIYA and day >= -7:
                status = "present"                        # keeps the streak intact
            elif sid == AMAN:
                status = "present" if day in aman_days else "absent"
            else:
                status = rng.choices(["present", "absent", "excused"], [8, 1, 1])[0]
            d.attendance.append((sess_id, sid, status))
            if status == "present" and rng.random() < 0.6:
                d.feedback.append((sess_id, sid, rng.choices([3, 4, 5], [1, 3, 3])[0], rng.choice(comments)))
    return d


def build_bulk(rng, n):
    d = Data()
    for sid in range(1, n + 1):
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        d.students.append((sid, name, f"user{sid}@bulk.test", rng.randint(1, 4), rng.choice(BRANCHES)))
        for subj in rng.sample(SUBJECTS, rng.randint(2, 4)):
            d.student_subject.append((sid, SUB_ID[subj], rng.randint(1, 5)))
        for _ in range(rng.randint(2, 5)):
            h = rng.randint(8, 20)
            d.add_slot(sid, rng.randint(1, 7), f"{h:02d}:00", f"{h + 2:02d}:00", rng.choice(MODES))
    # groups of 4, each student in at most one group (no clashes to check)
    ids = list(range(1, n + 1))
    rng.shuffle(ids)
    for i in range(0, len(ids) - 3, 4):
        gid = len(d.groups) + 1
        d.groups.append((gid, rng.randint(1, len(SUBJECTS)), f"Group {gid}", rng.choice(["online", "library"]), 4, ids[i]))
        d.members.append((ids[i], gid, "admin"))
        for sid in ids[i + 1:i + 4]:
            d.members.append((sid, gid, "member"))
        for day in rng.sample(range(-30, 10), 4):
            sess = d.add_session(gid, day, f"{rng.randint(8, 20):02d}:00", 60, "Library")
            if sess and day < 0:
                for sid in d.members_of(gid):
                    status = rng.choice(["present", "present", "present", "absent"])
                    d.attendance.append((sess, sid, status))
                    if status == "present" and rng.random() < 0.5:
                        d.feedback.append((sess, sid, rng.randint(1, 5), None))
    return d


def write_sql(d, path, title):
    out = []

    def insert(table, cols, rows, chunk=500):
        for i in range(0, len(rows), chunk):
            out.append(f"INSERT INTO {table} ({', '.join(cols)}) VALUES")
            out.append(",\n".join("  (" + ", ".join(r) + ")" for r in rows[i:i + chunk]) + ";")
        out.append("")

    out += [f"-- {title}", "-- Generated by db/generate_seed.py. Do not edit by hand: change the script and re-run it.",
            "-- Load order: schema.sql, triggers.sql, views.sql, procedures.sql, then this file.", "",
            "SET NAMES utf8mb4;",
            "SET @today = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'));  -- today in India", "",
            "START TRANSACTION;", ""]
    insert("subject", ["subject_id", "name"], [[str(i), q(n)] for n, i in SUB_ID.items()])
    insert("student", ["student_id", "name", "email", "password_hash", "year", "branch"],
           [[str(s[0]), q(s[1]), q(s[2]), q(PASSWORD_HASH), str(s[3]), q(s[4])] for s in d.students])
    insert("student_subject", ["student_id", "subject_id", "skill_level"],
           [[str(a), str(b), str(c)] for a, b, c in d.student_subject])
    insert("availability", ["student_id", "day_of_week", "start_time", "end_time", "mode_preference"],
           [[str(sid), str(dow), q(s), q(e), q(m)] for sid, rows in sorted(d.slots.items()) for dow, s, e, m in rows])
    insert("study_group", ["group_id", "subject_id", "name", "mode", "max_size", "created_by", "created_at"],
           [[str(g[0]), str(g[1]), q(g[2]), q(g[3]), str(g[4]), str(g[5]), "UTC_TIMESTAMP() - INTERVAL 30 DAY"] for g in d.groups])
    insert("membership", ["student_id", "group_id", "role", "joined_at"],
           [[str(m[0]), str(m[1]), q(m[2]), "UTC_TIMESTAMP() - INTERVAL 30 DAY"] for m in d.members])
    insert("study_session", ["session_id", "group_id", "start_datetime", "duration_minutes", "location_or_link"],
           [[str(s[0]), str(s[1]), ist(s[2], s[3]), str(s[4]), q(s[5])] for s in d.sessions])
    insert("attendance", ["session_id", "student_id", "status"],
           [[str(a), str(b), q(c)] for a, b, c in d.attendance])
    insert("feedback", ["session_id", "student_id", "rating", "comment"],
           [[str(a), str(b), str(c), "NULL" if t is None else q(t)] for a, b, c, t in d.feedback])
    out.append("COMMIT;")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    print(f"Wrote {path}: {len(d.students)} students, {len(d.groups)} groups, "
          f"{len(d.sessions)} sessions, {len(d.attendance)} attendance rows, {len(d.feedback)} feedback rows")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Generate Study Buddy seed data")
    ap.add_argument("--bulk", type=int, help="number of students for a large dataset (P2's EXPLAIN tests)")
    args = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    rng = random.Random(42)
    if args.bulk:
        write_sql(build_bulk(rng, args.bulk), os.path.join(here, "seed_bulk.sql"), f"Study Buddy bulk data ({args.bulk} students)")
    else:
        write_sql(build_demo(rng), os.path.join(here, "seed.sql"), "Study Buddy demo data")
