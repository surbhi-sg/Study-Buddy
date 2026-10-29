const HttpError = require('./httpError');

// Local time zone used for dates and availability slots (India). Sessions are stored in UTC.
const TZ = process.env.APP_TZ_OFFSET || '+05:30';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function id(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be a positive whole number`);
  return n;
}

function date(value, field = 'date') {
  if (!DATE_RE.test(String(value ?? ''))) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must look like YYYY-MM-DD`);
  return value;
}

function time(value, field) {
  if (!TIME_RE.test(String(value ?? ''))) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must look like HH:MM`);
  return value;
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be one of: ${allowed.join(', ')}`);
  return value;
}

function text(value, field, max, { required = true } = {}) {
  const s = String(value ?? '').trim();
  if (required && !s) throw new HttpError(400, 'VALIDATION_ERROR', `${field} is required`);
  if (s.length > max) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be at most ${max} characters`);
  return s;
}

const hhmm = (t) => (t == null ? null : String(t).slice(0, 5));   // '17:00:00' -> '17:00'

module.exports = { TZ, id, date, time, oneOf, text, hhmm };
