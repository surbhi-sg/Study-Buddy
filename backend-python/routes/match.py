"""Group study: ranked suggestions, then creating a group of up to 4 in one transaction."""
from flask import Blueprint, g, jsonify, request

import db
import validate as v
from config import TZ
from errors import HttpError
from routes.auth import login_required

bp = Blueprint("match", __name__, url_prefix="/api/match")

MAX_PICKS = 3   # a group has at most 4 people including the creator

# Every overlap between one of my free slots and a free slot of another student who studies the
# subject, on that weekday, where neither of us already has a session inside the overlap.
OVERLAPS = """
SELECT ss.student_id, ss.skill_level,
       a.mode_preference  AS their_mode,
       me.mode_preference AS my_mode,
       GREATEST(a.start_time, me.start_time) AS ov_start,
       LEAST(a.end_time, me.end_time)        AS ov_end
  FROM student_subject ss
  JOIN availability a  ON a.student_id = ss.student_id AND a.day_of_week = %(dow)s
  JOIN availability me ON me.student_id = %(me)s AND me.day_of_week = %(dow)s
                      AND a.start_time < me.end_time AND me.start_time < a.end_time
 WHERE ss.subject_id = %(subject)s
   AND ss.student_id <> %(me)s
   AND NOT EXISTS (
        SELECT 1 FROM membership m JOIN study_session s ON s.group_id = m.group_id
         WHERE m.student_id IN (ss.student_id, %(me)s)
           AND s.start_datetime < CONVERT_TZ(TIMESTAMP(%(date)s, LEAST(a.end_time, me.end_time)), %(tz)s, '+00:00')
           AND CONVERT_TZ(TIMESTAMP(%(date)s, GREATEST(a.start_time, me.start_time)), %(tz)s, '+00:00')
               < s.start_datetime + INTERVAL s.duration_minutes MINUTE)
"""

# Average rating of the sessions each student attended
RATINGS = """
SELECT a.student_id, AVG(f.rating) AS avg_rating
  FROM attendance a JOIN feedback f ON f.session_id = a.session_id
 WHERE a.status = 'present'
 GROUP BY a.student_id
"""


def match_score(overlap_min, my_free_min, skill, my_skill, mode_ok, avg_rating):
    """Score out of 100 = time (40) + skill (20) + mode (20) + rating (20)."""
    time_s = round(40 * min(overlap_min / my_free_min, 1)) if my_free_min else 0
    skill_s = max(0, 20 - 5 * abs(skill - my_skill))              # same level = 20, minus 5 per level apart
    mode_s = 20 if mode_ok else 0                                  # 'either' fits everything
    rating_s = 10 if avg_rating is None else round(float(avg_rating) / 5 * 20)   # no ratings yet = neutral 10
    return {"score": time_s + skill_s + mode_s + rating_s, "time": time_s, "skill": skill_s, "mode": mode_s, "rating": rating_s}


@bp.get("/candidates")
@login_required
def candidates():
    me = g.user_id
    subject_id = v.pos_int(request.args.get("subject_id"), "subject_id")
    date = v.date(request.args.get("date"))
    subject = db.query_one("SELECT name FROM subject WHERE subject_id = %s", (subject_id,))
    if not subject:
        raise HttpError(404, "NOT_FOUND", "Subject not found")

    dow = db.query_one("SELECT WEEKDAY(%s) + 1 AS dow", (date,))["dow"]   # ISO: 1 = Monday
    mine = db.query_one("SELECT skill_level FROM student_subject WHERE student_id = %s AND subject_id = %s", (me, subject_id))
    my_skill = mine["skill_level"] if mine else 3
    free = db.query_one(
        """SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))) / 60, 0) AS m
             FROM availability WHERE student_id = %s AND day_of_week = %s""", (me, dow))
    my_free = int(free["m"])

    rows = db.query(OVERLAPS, {"me": me, "dow": dow, "subject": subject_id, "date": date, "tz": TZ})
    ratings = {r["student_id"]: r["avg_rating"] for r in db.query(RATINGS)}

    best = {}   # each candidate's best overlap: compatible mode first, then the longest
    for r in rows:
        start, end = v.minutes(r["ov_start"]), v.minutes(r["ov_end"])
        mode_ok = "either" in (r["their_mode"], r["my_mode"]) or r["their_mode"] == r["my_mode"]
        key = (mode_ok, end - start)
        if r["student_id"] not in best or key > best[r["student_id"]]["key"]:
            best[r["student_id"]] = {**r, "start": start, "end": end, "mode_ok": mode_ok, "key": key}

    people = {}
    if best:
        ids = list(best)
        marks = ", ".join(["%s"] * len(ids))
        people = {p["student_id"]: p for p in db.query(
            f"SELECT student_id, name, year, branch FROM student WHERE student_id IN ({marks})", ids)}

    result = []
    for sid, b in best.items():
        rating = ratings.get(sid)
        result.append({
            **people[sid],
            "skill_level": b["skill_level"],
            "mode_preference": b["their_mode"],
            "slot": {"start_time": v.hhmm(b["start"]), "end_time": v.hhmm(b["end"])},
            "avg_rating": None if rating is None else round(float(rating), 1),
            "match": match_score(b["end"] - b["start"], my_free, b["skill_level"], my_skill, b["mode_ok"], rating),
            "_overlap": b["end"] - b["start"],
        })
    result.sort(key=lambda c: (-c["match"]["score"], -c["_overlap"], c["student_id"]))
    for c in result:
        del c["_overlap"]

    return jsonify({"subject_id": subject_id, "subject": subject["name"], "date": date,
                    "my_free_minutes": my_free, "max_picks": MAX_PICKS, "candidates": result[:10]})


@bp.post("/group")
@login_required
def create_group():
    """The group-study transaction.
    1. Lock every participant's student row (SELECT ... FOR UPDATE, in id order to avoid deadlocks).
    2. Re-check under the locks that nobody got booked at this time in the meantime.
    3. Insert the group (max_size 4), the memberships (creator = admin) and the first session.
    Any error rolls everything back, so a half-made group can never exist."""
    me, b = g.user_id, request.get_json(silent=True) or {}
    subject_id = v.pos_int(b.get("subject_id"), "subject_id")
    name = v.text(b.get("name"), "name", 100)
    mode = v.one_of(b.get("mode"), ("online", "library"), "mode")
    date = v.date(b.get("date"))
    start = v.time(b.get("start_time"), "start_time")
    end = v.time(b.get("end_time"), "end_time")
    location = v.text(b.get("location_or_link"), "location_or_link", 255)
    picks = b.get("member_ids")
    if not isinstance(picks, list) or not 1 <= len(picks) <= MAX_PICKS:
        raise v.bad("Pick 1 to 3 people (a group has at most 4 including you)")
    picks = [v.pos_int(x, f"member_ids[{i}]") for i, x in enumerate(picks)]
    if len(set(picks)) != len(picks) or me in picks:
        raise v.bad("Each person can be picked once, and not yourself")
    if end <= start:
        raise v.bad("The session must end after it starts")
    minutes = v.minutes(end) - v.minutes(start)
    if not 15 <= minutes <= 480:
        raise v.bad("A session must be 15 minutes to 8 hours long")

    everyone = sorted(picks + [me])
    marks = ", ".join(["%s"] * len(everyone))
    with db.transaction() as cur:
        cur.execute("SELECT CONVERT_TZ(TIMESTAMP(%s, %s), %s, '+00:00') AS t, UTC_TIMESTAMP() AS now", (date, start, TZ))
        t = cur.fetchone()
        start_utc = t["t"]
        if start_utc is None or start_utc <= t["now"]:
            raise v.bad("Pick a time in the future")

        # 1. lock the participants
        cur.execute(f"SELECT student_id FROM student WHERE student_id IN ({marks}) ORDER BY student_id FOR UPDATE", everyone)
        if len(cur.fetchall()) != len(everyone):
            raise HttpError(404, "NOT_FOUND", "One of the picked students does not exist")

        # 2. busy check, as a locking read so it sees sessions committed by others a moment ago
        cur.execute(
            f"""SELECT st.student_id, st.name
                  FROM membership m
                  JOIN study_session s ON s.group_id = m.group_id
                  JOIN student st      ON st.student_id = m.student_id
                 WHERE m.student_id IN ({marks})
                   AND s.start_datetime < %s + INTERVAL %s MINUTE
                   AND %s < s.start_datetime + INTERVAL s.duration_minutes MINUTE
                 LIMIT 1 LOCK IN SHARE MODE""", everyone + [start_utc, minutes, start_utc])
        busy = cur.fetchone()
        if busy and busy["student_id"] == me:
            raise HttpError(409, "STUDENT_BUSY", "You already have another session at this time. Pick a different time.")
        if busy:
            raise HttpError(409, "STUDENT_BUSY", f"{busy['name']} was just booked for another session at this time. Pick someone else.")

        # 3. create everything
        cur.execute("INSERT INTO study_group (subject_id, name, mode, max_size, created_by) VALUES (%s, %s, %s, 4, %s)",
                    (subject_id, name, mode, me))
        group_id = cur.lastrowid
        cur.execute("INSERT INTO membership (student_id, group_id, role) VALUES (%s, %s, 'admin')", (me, group_id))
        cur.executemany("INSERT INTO membership (student_id, group_id, role) VALUES (%s, %s, 'member')",
                        [(p, group_id) for p in picks])
        cur.execute("""INSERT INTO study_session (group_id, start_datetime, duration_minutes, location_or_link)
                       VALUES (%s, %s, %s, %s)""", (group_id, start_utc, minutes, location))
        session_id = cur.lastrowid
    return jsonify({"group_id": group_id, "session_id": session_id, "status": "created"}), 201
