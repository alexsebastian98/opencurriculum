require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Book = require('./models/Book');

async function run() {
  await connectDB();

  const docs = await Book.find({
    $or: [{ author: { $exists: false } }, { author: '' }, { author: null }],
  }).select('_id title');

  let changed = 0;
  for (const doc of docs) {
    await Book.updateOne({ _id: doc._id }, { $set: { author: 'Unknown Author' } });
    changed += 1;
  }

  console.log(`Author backfill complete. Updated ${changed} books.`);

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
