require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const Major = require('./models/Major');
const { runSeed } = require('./seed');

const majorsRouter = require('./routes/majors');
const subjectsRouter = require('./routes/subjects');
const booksRouter = require('./routes/books');
const suggestionsRouter = require('./routes/suggestions');
const githubRouter = require('./routes/github');

const app = express();

const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    ...(process.env.NODE_ENV === 'production' ? [] : localOrigins),
  ])
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (
        process.env.NODE_ENV === 'production' &&
        configuredOrigins.length === 0 &&
        origin.endsWith('.onrender.com')
      ) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'OpenCurriculum API',
    status: 'ok',
    health: '/health',
    endpoints: {
      majors: '/api/majors',
      subjects: '/api/subjects/:majorId',
      subjectDetail: '/api/subjects/detail/:subjectId',
      books: '/api/books/:subjectId',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/majors', majorsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/books', booksRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/github', githubRouter);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    const count = await Major.countDocuments();
    if (count === 0) {
      console.log('Empty database detected — running initial seed…');
      await runSeed();
    }
    app.listen(PORT, () => {
      console.log(`OpenCurriculum API listening on port ${PORT}`);
      if (allowedOrigins.length > 0) {
        console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
      } else if (process.env.NODE_ENV === 'production') {
        console.log('Allowed CORS origins: *.onrender.com fallback');
      } else {
        console.log('Allowed CORS origins: none configured');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
