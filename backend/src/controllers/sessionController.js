const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

// GET /api/sessions?from=2026-10-01&to=2026-11-30   my sessions for the calendar
exports.mySessions = asyncHandler(async (req, res) => {
  const from = v.date(req.query.from, 'from');
  const to = v.date(req.query.to, 'to');
  const [rows] = await pool.query(
    `SELECT session_id, group_id, group_name, subject_name AS subject, mode, start_datetime,
            duration_minutes, location_or_link, attendance_status
       FROM v_student_sessions
      WHERE student_id = ?
        AND start_datetime >= CONVERT_TZ(TIMESTAMP(?, '00:00'), ?, '+00:00')
        AND start_datetime <  CONVERT_TZ(TIMESTAMP(? + INTERVAL 1 DAY, '00:00'), ?, '+00:00')
      ORDER BY start_datetime`, [req.user.id, from, v.TZ, to, v.TZ]);
  res.json(rows);
});

async function pastSessionOrThrow(sessionId) {
  const [[s]] = await pool.query('SELECT start_datetime FROM study_session WHERE session_id = ?', [sessionId]);
  if (!s) throw new HttpError(404, 'NOT_FOUND', 'Session not found');
  if (new Date(s.start_datetime) > new Date()) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'This session has not started yet');
  }
}

// POST /api/sessions/:id/attendance   body: { status: present | absent | excused }   (marks myself)
// P2's trigger rejects non-members (NOT_A_MEMBER).
exports.markAttendance = asyncHandler(async (req, res) => {
  const sid = v.id(req.params.id, 'session id');
  const status = v.oneOf(req.body?.status, ['present', 'absent', 'excused'], 'status');
  await pastSessionOrThrow(sid);
  await pool.query(
    `INSERT INTO attendance (session_id, student_id, status) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`, [sid, req.user.id, status]);
  res.json({ session_id: sid, status });
});

// POST /api/sessions/:id/feedback   body: { rating: 1-5, comment? }
// P1's FK + P2's trigger: only for sessions I attended (NOT_ATTENDED).
exports.giveFeedback = asyncHandler(async (req, res) => {
  const sid = v.id(req.params.id, 'session id');
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'rating must be 1 to 5');
  }
  const comment = v.text(req.body?.comment, 'comment', 1000, { required: false }) || null;
  try {
    await pool.query(
      `INSERT INTO feedback (session_id, student_id, rating, comment) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`, [sid, req.user.id, rating, comment]);
  } catch (err) {
    if (err.errno === 1452) throw new HttpError(403, 'NOT_ATTENDED', 'You can only rate sessions you attended');
    throw err;
  }
  res.status(201).json({ session_id: sid, rating, comment });
});
