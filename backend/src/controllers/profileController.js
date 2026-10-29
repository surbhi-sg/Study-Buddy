const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

// GET /api/subjects  (public: needed on the register page too)
exports.listSubjects = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT subject_id, name FROM subject ORDER BY name');
  res.json(rows);
});

async function loadProfile(me) {
  const [[student]] = await pool.query(
    'SELECT student_id, name, email, year, branch FROM student WHERE student_id = ?', [me]);
  if (!student) throw new HttpError(401, 'UNAUTHENTICATED', 'Account no longer exists');

  const [subjects] = await pool.query(
    `SELECT ss.subject_id, s.name, ss.skill_level
       FROM student_subject ss JOIN subject s ON s.subject_id = ss.subject_id
      WHERE ss.student_id = ? ORDER BY s.name`, [me]);
  const [slots] = await pool.query(
    `SELECT day_of_week, start_time, end_time, mode_preference
       FROM availability WHERE student_id = ? ORDER BY day_of_week, start_time`, [me]);

  return {
    ...student,
    subjects,
    availability: slots.map((s) => ({ ...s, start_time: v.hhmm(s.start_time), end_time: v.hhmm(s.end_time) })),
  };
}

// GET /api/profile
exports.getProfile = asyncHandler(async (req, res) => {
  res.json(await loadProfile(req.user.id));
});

// PUT /api/profile/subjects   body: { subjects: [{ subject_id, skill_level }] }
// Replaces the whole list in one transaction.
exports.putSubjects = asyncHandler(async (req, res) => {
  const list = req.body?.subjects;
  if (!Array.isArray(list) || list.length > 20) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'subjects must be a list (at most 20)');
  }
  const rows = list.map((s, i) => {
    const skill = Number(s.skill_level);
    if (!Number.isInteger(skill) || skill < 1 || skill > 5) {
      throw new HttpError(400, 'VALIDATION_ERROR', `subjects[${i}].skill_level must be 1 to 5`);
    }
    return [req.user.id, v.id(s.subject_id, `subjects[${i}].subject_id`), skill];
  });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM student_subject WHERE student_id = ?', [req.user.id]);
    if (rows.length) {
      await conn.query('INSERT INTO student_subject (student_id, subject_id, skill_level) VALUES ?', [rows]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;          // duplicate subject -> 409, unknown subject -> 404 (errorHandler)
  } finally {
    conn.release();
  }
  res.json(await loadProfile(req.user.id));
});

// PUT /api/profile/availability   body: { slots: [{ day_of_week, start_time, end_time, mode_preference }] }
// Replaces the whole weekly timetable in one transaction. P1's trigger rejects overlapping slots.
exports.putAvailability = asyncHandler(async (req, res) => {
  const list = req.body?.slots;
  if (!Array.isArray(list) || list.length > 50) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'slots must be a list (at most 50)');
  }
  const rows = list.map((s, i) => {
    const day = Number(s.day_of_week);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new HttpError(400, 'VALIDATION_ERROR', `slots[${i}].day_of_week must be 1 (Mon) to 7 (Sun)`);
    }
    const start = v.time(s.start_time, `slots[${i}].start_time`);
    const end = v.time(s.end_time, `slots[${i}].end_time`);
    if (end <= start) throw new HttpError(400, 'VALIDATION_ERROR', `slots[${i}] must end after it starts`);
    const mode = v.oneOf(s.mode_preference || 'either', ['online', 'library', 'either'], `slots[${i}].mode_preference`);
    return [req.user.id, day, start, end, mode];
  });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM availability WHERE student_id = ?', [req.user.id]);
    for (const r of rows) {     // one by one so the overlap trigger checks each slot against the others
      await conn.query(
        'INSERT INTO availability (student_id, day_of_week, start_time, end_time, mode_preference) VALUES (?, ?, ?, ?, ?)', r);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json(await loadProfile(req.user.id));
});
