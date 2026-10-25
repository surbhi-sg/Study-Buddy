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

  const details = {};
  if (!name || !String(name).trim()) details.name = 'is required';
  if (!email || !EMAIL_RE.test(String(email).trim())) details.email = 'must be a valid email';
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    details.password = 'must be 8 to 72 characters';   // bcrypt ignores everything after 72 bytes
  }
  if (!Number.isInteger(year) || year < 1 || year > 4) {
    details.year = 'is required (whole number from 1 to 4)';
  }
  if (Object.keys(details).length) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid input', details);
  }

  const hash = await bcrypt.hash(password, 10);
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  // A duplicate email raises errno 1062, which errorHandler turns into 409 ALREADY_EXISTS
  const [result] = await pool.query(
    'INSERT INTO student (name, email, password_hash, year, branch) VALUES (?, ?, ?, ?, ?)',
    [cleanName, cleanEmail, hash, year, branch ?? null]
  );

  res.status(201).json({
    token: signToken(result.insertId),
    student: { student_id: result.insertId, name: cleanName, email: cleanEmail, year, branch: branch ?? null },
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