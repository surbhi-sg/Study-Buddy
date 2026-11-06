"""Browse groups, see one group, join and leave."""
from flask import Blueprint, g, jsonify, request

import db
import queries as q
import validate as v
from errors import HttpError
from routes.auth import login_required

bp = Blueprint("groups", __name__, url_prefix="/api/groups")


@bp.get("")
@login_required
def list_groups():
    where, params = [], {"me": g.user_id}
    if request.args.get("subject_id"):
        where.append("gs.subject_id = %(subject_id)s")
        params["subject_id"] = v.pos_int(request.args["subject_id"], "subject_id")
    if request.args.get("mode"):
        where.append("gs.mode = %(mode)s")
        params["mode"] = v.one_of(request.args["mode"], ("online", "library"), "mode")
    rows = db.query(f"""
        SELECT gs.*, EXISTS (SELECT 1 FROM membership m
                              WHERE m.group_id = gs.group_id AND m.student_id = %(me)s) AS is_member
          FROM ({q.GROUP_SUMMARY}) gs
         {"WHERE " + " AND ".join(where) if where else ""}
         ORDER BY gs.member_count >= gs.max_size, gs.next_session IS NULL, gs.next_session""", params)
    for r in rows:
        r["is_member"] = bool(r["is_member"])
    return jsonify(rows)


@bp.get("/<gid>")
@login_required
def get_group(gid):
    gid, me = v.pos_int(gid, "group id"), g.user_id
    group = db.query_one(f"SELECT * FROM ({q.GROUP_SUMMARY}) gs WHERE gs.group_id = %s", (gid,))
    if not group:
        raise HttpError(404, "NOT_FOUND", "Group not found")
    members = db.query(
        """SELECT st.student_id, st.name, st.year, st.branch, m.role, m.joined_at
             FROM membership m JOIN student st ON st.student_id = m.student_id
            WHERE m.group_id = %s ORDER BY m.role = 'admin' DESC, m.joined_at""", (gid,))
    is_member = any(m["student_id"] == me for m in members)
    sessions = db.query(
        """SELECT s.session_id, s.start_datetime, s.duration_minutes, s.location_or_link,
                  a.status AS my_attendance, f.rating AS my_rating
             FROM study_session s
             LEFT JOIN attendance a ON a.session_id = s.session_id AND a.student_id = %(me)s
             LEFT JOIN feedback f   ON f.session_id = s.session_id AND f.student_id = %(me)s
            WHERE s.group_id = %(gid)s
            ORDER BY s.start_datetime DESC""", {"me": me, "gid": gid})
    if not is_member:   # place/link and personal fields only for members
        for s in sessions:
            s.update(location_or_link=None, my_attendance=None, my_rating=None)
    return jsonify({**group, "is_member": is_member, "members": members, "sessions": sessions})


@bp.post("/<gid>/join")
@login_required
def join_group(gid):
    """Join in one transaction. The group row is locked (FOR UPDATE) so two students
    cannot both take the last seat at the same moment."""
    gid, me = v.pos_int(gid, "group id"), g.user_id
    with db.transaction() as cur:
        cur.execute("SELECT max_size FROM study_group WHERE group_id = %s FOR UPDATE", (gid,))
        group = cur.fetchone()
        if not group:
            raise HttpError(404, "NOT_FOUND", "Group not found")
        cur.execute("SELECT 1 FROM membership WHERE group_id = %s AND student_id = %s", (gid, me))
        if cur.fetchone():
            raise HttpError(409, "ALREADY_EXISTS", "You are already in this group")
        cur.execute("SELECT COUNT(*) AS n FROM membership WHERE group_id = %s", (gid,))
        if cur.fetchone()["n"] >= group["max_size"]:
            raise HttpError(409, "GROUP_FULL", "This group is already full")
        # No clash: none of the group's upcoming sessions may overlap a session I already have
        cur.execute(
            """SELECT 1
                 FROM study_session gs
                 JOIN membership m    ON m.student_id = %(me)s
                 JOIN study_session o ON o.group_id = m.group_id
                WHERE gs.group_id = %(gid)s AND gs.start_datetime > UTC_TIMESTAMP()
                  AND o.start_datetime < gs.start_datetime + INTERVAL gs.duration_minutes MINUTE
                  AND gs.start_datetime < o.start_datetime + INTERVAL o.duration_minutes MINUTE
                LIMIT 1""", {"me": me, "gid": gid})
        if cur.fetchone():
            raise HttpError(409, "SESSION_OVERLAP", "This group meets at a time you already have another session")
        cur.execute("INSERT INTO membership (student_id, group_id, role) VALUES (%s, %s, 'member')", (me, gid))
    return jsonify({"group_id": gid, "status": "joined"}), 201


@bp.post("/<gid>/leave")
@login_required
def leave_group(gid):
    gid = v.pos_int(gid, "group id")
    count, _ = db.execute("DELETE FROM membership WHERE student_id = %s AND group_id = %s", (g.user_id, gid))
    if not count:
        raise HttpError(404, "NOT_FOUND", "You are not in this group")
    return jsonify({"group_id": gid, "status": "left"})
