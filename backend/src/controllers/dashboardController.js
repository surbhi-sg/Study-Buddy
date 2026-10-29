const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard: everything the home page needs in one call (uses P2's views)
exports.getDashboard = asyncHandler(async (req, res) => {
  const me = req.user.id;

  const [[student]] = await pool.query('SELECT student_id, name FROM student WHERE student_id = ?', [me]);
  const [[streak]] = await pool.query(
    'SELECT current_streak, longest_streak FROM v_student_streak WHERE student_id = ?', [me]);

  const [upcoming] = await pool.query(
    `SELECT session_id, group_id, group_name, subject_name AS subject, mode,
            start_datetime, duration_minutes, location_or_link
       FROM v_student_sessions
      WHERE student_id = ?
        AND start_datetime + INTERVAL duration_minutes MINUTE > UTC_TIMESTAMP()
      ORDER BY start_datetime
      LIMIT 5`, [me]);

  const [groups] = await pool.query(
    `SELECT g.group_id, g.name AS group_name, g.subject_name AS subject, g.mode,
            g.member_count, g.max_size, g.next_session, m.role
       FROM membership m
       JOIN v_group_summary g ON g.group_id = m.group_id
      WHERE m.student_id = ?
      ORDER BY g.next_session IS NULL, g.next_session`, [me]);

  res.json({
    student,
    streak: streak?.current_streak ?? 0,
    longest_streak: streak?.longest_streak ?? 0,
    upcoming_sessions: upcoming,
    groups,
  });
});
