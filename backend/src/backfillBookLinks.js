require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Book = require('./models/Book');

async function run() {
  await connectDB();

  const docs = await Book.find({
    source: 'github',
    source_url: { $ne: '' },
    $or: [{ book_url: { $exists: false } }, { book_url: '' }],
  }).select('_id source_url');

  let changed = 0;
  for (const doc of docs) {
    await Book.updateOne({ _id: doc._id }, { $set: { book_url: doc.source_url } });
    changed += 1;
  }

  console.log(`Backfill complete. Updated ${changed} books.`);

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
