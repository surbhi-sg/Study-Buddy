"""Home page data in one call: streak, upcoming sessions, my groups."""
from flask import Blueprint, g, jsonify

import db
import queries as q
from routes.auth import login_required

bp = Blueprint("dashboard", __name__, url_prefix="/api")


@bp.get("/dashboard")
@login_required
def dashboard():
    me = g.user_id
    student = db.query_one("SELECT student_id, name FROM student WHERE student_id = %s", (me,))
    streak = db.query_one(q.STREAK, {"me": me, "tz": q.tz()})
    upcoming = db.query(q.STUDENT_SESSIONS + """
        AND s.start_datetime + INTERVAL s.duration_minutes MINUTE > UTC_TIMESTAMP()
        ORDER BY s.start_datetime LIMIT 5""", {"me": me})
    groups = db.query(f"""
        SELECT gs.group_id, gs.group_name, gs.subject, gs.mode, gs.member_count, gs.max_size, gs.next_session, m.role
          FROM membership m JOIN ({q.GROUP_SUMMARY}) gs ON gs.group_id = m.group_id
         WHERE m.student_id = %(me)s
         ORDER BY gs.next_session IS NULL, gs.next_session""", {"me": me})
    return jsonify({
        "student": student,
        "streak": int(streak["current_streak"]),
        "longest_streak": int(streak["longest_streak"]),
        "upcoming_sessions": upcoming,
        "groups": groups,
    })
