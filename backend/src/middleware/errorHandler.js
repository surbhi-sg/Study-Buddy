const DB_ERRORS = {
  1062: [409, 'ALREADY_EXISTS', 'Already exists'],
  1452: [404, 'NOT_FOUND', 'Related record not found'],
  1451: [409, 'IN_USE', 'Still in use'],
  1048: [400, 'VALIDATION_ERROR', 'Field is required'],
  1364: [400, 'VALIDATION_ERROR', 'Field is required'],
  3819: [400, 'VALIDATION_ERROR', 'Value out of range'],
};
const TRIGGER_STATUS = {
  GROUP_FULL: 409, SESSION_OVERLAP: 409, SLOT_OVERLAP: 409, NOT_A_MEMBER: 403,
  NOT_ATTENDED: 403, STUDENT_BUSY: 409, VALIDATION_ERROR: 400, NOT_FOUND: 404,
};

module.exports = function errorHandler(err, req, res, next) {
  if (err.status && err.code) {                       // our own HttpError
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {           // malformed JSON body
    return res.status(400).json({ error: 'Invalid JSON', code: 'VALIDATION_ERROR' });
  }
  if (err.errno === 1644) {                           // raised by P2's triggers: "CODE: text"
    const i = (err.sqlMessage || '').indexOf(':');
    const code = i > 0 ? err.sqlMessage.slice(0, i).trim() : 'CONFLICT';
    const message = i > 0 ? err.sqlMessage.slice(i + 1).trim() : err.sqlMessage;
    return res.status(TRIGGER_STATUS[code] || 409).json({ error: message, code });
  }
  if (DB_ERRORS[err.errno]) {
    const [status, code, message] = DB_ERRORS[err.errno];
    return res.status(status).json({ error: message, code });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
};