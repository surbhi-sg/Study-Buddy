"""Subjects list, and the logged-in student's profile: subjects with skill levels and weekly free slots."""
from flask import Blueprint, g, jsonify, request

import db
import validate as v
from errors import HttpError
from routes.auth import login_required

bp = Blueprint("profile", __name__, url_prefix="/api")


@bp.get("/subjects")
def list_subjects():      # public: also needed before login
    return jsonify(db.query("SELECT subject_id, name FROM subject ORDER BY name"))


def load_profile(me):
    student = db.query_one("SELECT student_id, name, email, year, branch FROM student WHERE student_id = %s", (me,))
    if not student:
        raise HttpError(401, "UNAUTHENTICATED", "Account no longer exists")
    student["subjects"] = db.query(
        """SELECT ss.subject_id, s.name, ss.skill_level
             FROM student_subject ss JOIN subject s ON s.subject_id = ss.subject_id
            WHERE ss.student_id = %s ORDER BY s.name""", (me,))
    slots = db.query(
        """SELECT day_of_week, start_time, end_time, mode_preference
             FROM availability WHERE student_id = %s ORDER BY day_of_week, start_time""", (me,))
    student["availability"] = [
        {**s, "start_time": v.hhmm(s["start_time"]), "end_time": v.hhmm(s["end_time"])} for s in slots]
    return student


@bp.get("/profile")
@login_required
def get_profile():
    return jsonify(load_profile(g.user_id))


@bp.put("/profile/subjects")
@login_required
def put_subjects():
    """Replace the whole subject list in one transaction. body: {subjects: [{subject_id, skill_level}]}"""
    items = (request.get_json(silent=True) or {}).get("subjects")
    if not isinstance(items, list) or len(items) > 20:
        raise v.bad("subjects must be a list (at most 20)")
    rows = [(g.user_id, v.pos_int(s.get("subject_id"), f"subjects[{i}].subject_id"),
             v.int_range(s.get("skill_level"), f"subjects[{i}].skill_level", 1, 5))
            for i, s in enumerate(items)]
    with db.transaction() as cur:
        cur.execute("DELETE FROM student_subject WHERE student_id = %s", (g.user_id,))
        if rows:
            cur.executemany("INSERT INTO student_subject (student_id, subject_id, skill_level) VALUES (%s, %s, %s)", rows)
    return jsonify(load_profile(g.user_id))


@bp.put("/profile/availability")
@login_required
def put_availability():
    """Replace the weekly timetable in one transaction. P1's trigger rejects overlapping slots."""
    items = (request.get_json(silent=True) or {}).get("slots")
    if not isinstance(items, list) or len(items) > 50:
        raise v.bad("slots must be a list (at most 50)")
    rows = []
    for i, s in enumerate(items):
        day = v.int_range(s.get("day_of_week"), f"slots[{i}].day_of_week", 1, 7)
        start = v.time(s.get("start_time"), f"slots[{i}].start_time")
        end = v.time(s.get("end_time"), f"slots[{i}].end_time")
        if end <= start:
            raise v.bad(f"slots[{i}] must end after it starts")
        mode = v.one_of(s.get("mode_preference") or "either", ("online", "library", "either"), f"slots[{i}].mode_preference")
        rows.append((g.user_id, day, start, end, mode))
    with db.transaction() as cur:
        cur.execute("DELETE FROM availability WHERE student_id = %s", (g.user_id,))
        for r in rows:   # one at a time so the overlap trigger checks each slot against the others
            cur.execute("""INSERT INTO availability (student_id, day_of_week, start_time, end_time, mode_preference)
                           VALUES (%s, %s, %s, %s, %s)""", r)
    return jsonify(load_profile(g.user_id))
