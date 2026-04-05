require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const Major = require('./models/Major');
const { runSeed } = require('./seed');

const majorsRouter = require('./routes/majors');
const subjectsRouter = require('./routes/subjects');
const booksRouter = require('./routes/books');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/majors', majorsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/books', booksRouter);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    const count = await Major.countDocuments();
    if (count === 0) {
      console.log('Empty database detected — running initial seed…');
      await runSeed();
    }
    app.listen(PORT, () =>
      console.log(`OpenCurriculum API running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
