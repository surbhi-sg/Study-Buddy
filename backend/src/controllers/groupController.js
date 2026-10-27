const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

// GET /api/groups?subject_id=&mode=   Browse groups (P2's v_group_summary)
exports.listGroups = asyncHandler(async (req, res) => {
  const where = [];
  const params = [req.user.id];
  if (req.query.subject_id) { where.push('g.subject_id = ?'); params.push(v.id(req.query.subject_id, 'subject_id')); }
  if (req.query.mode) { where.push('g.mode = ?'); params.push(v.oneOf(req.query.mode, ['online', 'library'], 'mode')); }

  const [rows] = await pool.query(
    `SELECT g.group_id, g.name AS group_name, g.subject_id, g.subject_name AS subject, g.mode,
            g.member_count, g.max_size, g.next_session, g.avg_rating,
            EXISTS (SELECT 1 FROM membership m WHERE m.group_id = g.group_id AND m.student_id = ?) AS is_member
       FROM v_group_summary g
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY (g.member_count >= g.max_size), g.next_session IS NULL, g.next_session`, params);

  res.json(rows.map((r) => ({ ...r, is_member: !!r.is_member })));
});

// GET /api/groups/:id   members and sessions; private details (link, attendance) only for members
exports.getGroup = asyncHandler(async (req, res) => {
  const gid = v.id(req.params.id, 'group id');
  const me = req.user.id;

  const [[group]] = await pool.query(
    `SELECT group_id, name AS group_name, subject_id, subject_name AS subject, mode, max_size,
            member_count, next_session, avg_rating, created_by
       FROM v_group_summary WHERE group_id = ?`, [gid]);
  if (!group) throw new HttpError(404, 'NOT_FOUND', 'Group not found');

  const [members] = await pool.query(
    `SELECT st.student_id, st.name, st.year, st.branch, m.role, m.joined_at
       FROM membership m JOIN student st ON st.student_id = m.student_id
      WHERE m.group_id = ? ORDER BY m.role = 'admin' DESC, m.joined_at`, [gid]);
  const isMember = members.some((m) => m.student_id === me);

  const [sessions] = await pool.query(
    `SELECT s.session_id, s.start_datetime, s.duration_minutes, s.location_or_link,
            a.status AS my_attendance, f.rating AS my_rating
       FROM study_session s
       LEFT JOIN attendance a ON a.session_id = s.session_id AND a.student_id = ?
       LEFT JOIN feedback f   ON f.session_id = s.session_id AND f.student_id = ?
      WHERE s.group_id = ?
      ORDER BY s.start_datetime DESC`, [me, me, gid]);

  res.json({
    ...group,
    is_member: isMember,
    members,
    sessions: sessions.map((s) => (isMember ? s : { ...s, location_or_link: null, my_attendance: null, my_rating: null })),
  });
});

// POST /api/groups/:id/join   P2's triggers reject a full group (GROUP_FULL) or a time clash (SESSION_OVERLAP)
exports.joinGroup = asyncHandler(async (req, res) => {
  const gid = v.id(req.params.id, 'group id');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("INSERT INTO membership (student_id, group_id, role) VALUES (?, ?, 'member')", [req.user.id, gid]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.errno === 1062) throw new HttpError(409, 'ALREADY_EXISTS', 'You are already in this group');
    if (err.errno === 1452) throw new HttpError(404, 'NOT_FOUND', 'Group not found');
    throw err;
  } finally {
    conn.release();
  }
  res.status(201).json({ group_id: gid, status: 'joined' });
});

// POST /api/groups/:id/leave
exports.leaveGroup = asyncHandler(async (req, res) => {
  const gid = v.id(req.params.id, 'group id');
  const [result] = await pool.query('DELETE FROM membership WHERE student_id = ? AND group_id = ?', [req.user.id, gid]);
  if (!result.affectedRows) throw new HttpError(404, 'NOT_FOUND', 'You are not in this group');
  res.json({ group_id: gid, status: 'left' });
});
