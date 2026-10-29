const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const HttpError = require('./utils/httpError');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found')));
app.use(errorHandler);   // must be last

module.exports = app;