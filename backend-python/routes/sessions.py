"""Calendar, attendance and feedback."""
from flask import Blueprint, g, jsonify, request

import db
import queries as q
import validate as v
from config import TZ
from errors import HttpError
from routes.auth import login_required

bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")


@bp.get("")
@login_required
def my_sessions():
    """My sessions between two local dates (inclusive), for the calendar."""
    frm = v.date(request.args.get("from"), "from")
    to = v.date(request.args.get("to"), "to")
    rows = db.query(q.STUDENT_SESSIONS + """
        AND s.start_datetime >= CONVERT_TZ(TIMESTAMP(%(frm)s, '00:00'), %(tz)s, '+00:00')
        AND s.start_datetime <  CONVERT_TZ(TIMESTAMP(%(to)s + INTERVAL 1 DAY, '00:00'), %(tz)s, '+00:00')
        ORDER BY s.start_datetime""", {"me": g.user_id, "frm": frm, "to": to, "tz": TZ})
    return jsonify(rows)


def session_or_404(session_id):
    s = db.query_one("SELECT group_id, start_datetime <= UTC_TIMESTAMP() AS started FROM study_session WHERE session_id = %s",
                     (session_id,))
    if not s:
        raise HttpError(404, "NOT_FOUND", "Session not found")
    return s


@bp.post("/<sid>/attendance")
@login_required
def mark_attendance(sid):
    """Mark myself present / absent / excused. Only members of the session's group, only after it starts."""
    sid = v.pos_int(sid, "session id")
    status = v.one_of((request.get_json(silent=True) or {}).get("status"), ("present", "absent", "excused"), "status")
    s = session_or_404(sid)
    if not s["started"]:
        raise v.bad("This session has not started yet")
    if not db.query_one("SELECT 1 FROM membership WHERE group_id = %s AND student_id = %s", (s["group_id"], g.user_id)):
        raise HttpError(403, "NOT_A_MEMBER", "Only members of this group can be marked for its sessions")
    db.execute("""INSERT INTO attendance (session_id, student_id, status) VALUES (%s, %s, %s)
                  ON DUPLICATE KEY UPDATE status = VALUES(status)""", (sid, g.user_id, status))
    return jsonify({"session_id": sid, "status": status})


@bp.post("/<sid>/feedback")
@login_required
def give_feedback(sid):
    """Rate a session 1-5. Only if I was marked present (the FK to attendance plus this check)."""
    sid = v.pos_int(sid, "session id")
    b = request.get_json(silent=True) or {}
    rating = v.int_range(b.get("rating"), "rating", 1, 5)
    comment = v.text(b.get("comment"), "comment", 1000, required=False) or None
    att = db.query_one("SELECT status FROM attendance WHERE session_id = %s AND student_id = %s", (sid, g.user_id))
    if not att or att["status"] != "present":
        raise HttpError(403, "NOT_ATTENDED", "You can only rate sessions you attended")
    db.execute("""INSERT INTO feedback (session_id, student_id, rating, comment) VALUES (%s, %s, %s, %s)
                  ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)""",
               (sid, g.user_id, rating, comment))
    return jsonify({"session_id": sid, "rating": rating, "comment": comment}), 201
