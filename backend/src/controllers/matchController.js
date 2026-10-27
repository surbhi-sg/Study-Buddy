const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

// GET /api/match/candidates?subject_id=1&date=2026-10-29
// Ranked study partners from P2's sp_match_candidates, with the score breakdown.
exports.candidates = asyncHandler(async (req, res) => {
  const subjectId = v.id(req.query.subject_id, 'subject_id');
  const date = v.date(req.query.date);

  const [[subject]] = await pool.query('SELECT name FROM subject WHERE subject_id = ?', [subjectId]);
  if (!subject) throw new HttpError(404, 'NOT_FOUND', 'Subject not found');

  // How much free time do I have that day? (0 -> the UI explains why there are no matches)
  const [[mine]] = await pool.query(
    `SELECT COALESCE(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time))) / 60, 0) AS minutes
       FROM availability WHERE student_id = ? AND day_of_week = WEEKDAY(?) + 1`, [req.user.id, date]);

  const [[rows]] = await pool.query('CALL sp_match_candidates(?, ?, ?, ?, 10)', [req.user.id, subjectId, date, v.TZ]);

  res.json({
    subject_id: subjectId,
    subject: subject.name,
    date,
    my_free_minutes: Number(mine.minutes),
    max_picks: 3,                         // a group has at most 4 people including me
    candidates: rows.map((r) => ({
      student_id: r.student_id,
      name: r.name,
      year: r.year,
      branch: r.branch,
      skill_level: r.skill_level,
      mode_preference: r.mode_preference,
      slot: { start_time: r.slot_start, end_time: r.slot_end },
      avg_rating: r.avg_rating,
      match: { score: r.match_score, time: r.time_score, skill: r.skill_score, mode: r.mode_score, rating: r.rating_score },
    })),
  });
});

// POST /api/match/group
// body: { subject_id, name, mode, date, start_time, end_time, location_or_link, member_ids: [1-3 ids] }
// Calls P2's sp_create_study_group: one transaction that locks the picked students,
// re-checks that nobody got booked meanwhile, then creates group + memberships + session.
exports.createGroup = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const subjectId = v.id(b.subject_id, 'subject_id');
  const name = v.text(b.name, 'name', 100);
  const mode = v.oneOf(b.mode, ['online', 'library'], 'mode');
  const date = v.date(b.date);
  const start = v.time(b.start_time, 'start_time');
  const end = v.time(b.end_time, 'end_time');
  const location = v.text(b.location_or_link, 'location_or_link', 255);
  if (!Array.isArray(b.member_ids) || b.member_ids.length < 1 || b.member_ids.length > 3) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Pick 1 to 3 people (a group has at most 4 including you)');
  }
  const memberIds = b.member_ids.map((x, i) => v.id(x, `member_ids[${i}]`));

  const conn = await pool.getConnection();   // same connection for CALL and reading the OUT params
  try {
    await conn.query('CALL sp_create_study_group(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @gid, @sid)',
      [req.user.id, subjectId, name, mode, date, start, end, v.TZ, location, JSON.stringify(memberIds)]);
    const [[out]] = await conn.query('SELECT @gid AS group_id, @sid AS session_id');
    res.status(201).json({ group_id: out.group_id, session_id: out.session_id, status: 'created' });
  } finally {
    conn.release();
  }
});
