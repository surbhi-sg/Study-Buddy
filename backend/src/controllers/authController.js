const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function signToken(studentId) {
  return jwt.sign({ id: studentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, year, branch } = req.body || {};

  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const cleanBranch = String(branch ?? '').trim();

  const details = {};
  if (!cleanName) details.name = 'is required';
  else if (cleanName.length > 100) details.name = 'must be at most 100 characters';

  if (!EMAIL_RE.test(cleanEmail)) details.email = 'must be a valid email';
  else if (cleanEmail.length > 255) details.email = 'must be at most 255 characters';

  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    details.password = 'must be 8 to 72 characters';   // bcrypt ignores everything after 72 bytes
  }

  if (!Number.isInteger(year) || year < 1 || year > 6) {
    details.year = 'is required (whole number from 1 to 6)';   // matches ck_student_year in schema.sql
  }

  if (!cleanBranch) details.branch = 'is required';
  else if (cleanBranch.length > 60) details.branch = 'must be at most 60 characters';

  if (Object.keys(details).length) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid input', details);
  }

  const hash = await bcrypt.hash(password, 10);

  // A duplicate email raises errno 1062, which errorHandler turns into 409 ALREADY_EXISTS
  const [result] = await pool.query(
    'INSERT INTO student (name, email, password_hash, year, branch) VALUES (?, ?, ?, ?, ?)',
    [cleanName, cleanEmail, hash, year, cleanBranch]
  );

  res.status(201).json({
    token: signToken(result.insertId),
    student: { student_id: result.insertId, name: cleanName, email: cleanEmail, year, branch: cleanBranch },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || typeof password !== 'string' || !password) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'email and password are required');
  }

  const [rows] = await pool.query(
    'SELECT student_id, name, email, year, branch, password_hash FROM student WHERE email = ?',
    [String(email).trim().toLowerCase()]
  );
  const student = rows[0];
  const ok = await bcrypt.compare(password, student ? student.password_hash : DUMMY_HASH);
  if (!student || !ok) {
    // Same message whether the email or the password was wrong
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  res.json({
    token: signToken(student.student_id),
    student: { student_id: student.student_id, name: student.name, email: student.email, year: student.year, branch: student.branch },
  });
});

exports.me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT student_id, name, email, year, branch FROM student WHERE student_id = ?',
    [req.user.id]
  );
  if (!rows[0]) throw new HttpError(401, 'UNAUTHENTICATED', 'Account no longer exists');
  res.json(rows[0]);
});