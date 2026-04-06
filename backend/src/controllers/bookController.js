const Book = require('../models/Book');
const Subject = require('../models/Subject');
const { enrichBookMetadata } = require('../services/bookMetadataService');

function toMetadataUpdates(metadata) {
  return {
    author: metadata?.author || 'Unknown Author',
    isbn_10: metadata?.isbn_10 || '',
    isbn_13: metadata?.isbn_13 || '',
    synopsis: metadata?.synopsis || '',
    author_summary: metadata?.author_summary || '',
    metadata_source: metadata?.metadata_source || '',
    description_source: metadata?.description_source || '',
    metadata_confidence: metadata?.metadata_confidence || 0,
    metadata_error: metadata?.metadata_error || '',
    metadata_refreshed_at: metadata?.metadata_refreshed_at || null,
    metadata_updated_at: metadata?.metadata_updated_at || null,
  };
}

async function refreshBookDocument(book) {
  const metadata = await enrichBookMetadata({
    title: book.title,
    author: book.author,
    isbn_10: book.isbn_10,
    isbn_13: book.isbn_13,
  });

  const updates = toMetadataUpdates(metadata);
  await Book.updateOne({ _id: book._id }, { $set: updates });
  return updates;
}

async function getBooksBySubject(req, res) {
  try {
    const books = await Book.find({ subject_id: req.params.subjectId }).sort({ title: 1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function refreshBookMetadata(req, res) {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const updates = await refreshBookDocument(book);
    res.json({ ok: true, book_id: book._id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function refreshBooksBySubject(req, res) {
  try {
    const books = await Book.find({ subject_id: req.params.subjectId }).sort({ title: 1 });
    const failures = [];
    let success = 0;

    for (const book of books) {
      try {
        await refreshBookDocument(book);
        success += 1;
      } catch (err) {
        failures.push({ book_id: book._id, title: book.title, error: err.message });
      }
    }

    res.json({
      total: books.length,
      success,
      failed: failures.length,
      failures,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function refreshBooksByMajor(req, res) {
  try {
    const subjects = await Subject.find({ major_id: req.params.majorId }).select('_id');
    const subjectIds = subjects.map((subject) => subject._id);
    const books = await Book.find({ subject_id: { $in: subjectIds } }).sort({ title: 1 });

    const failures = [];
    let success = 0;

    for (const book of books) {
      try {
        await refreshBookDocument(book);
        success += 1;
      } catch (err) {
        failures.push({ book_id: book._id, title: book.title, error: err.message });
      }
    }

    res.json({
      total: books.length,
      success,
      failed: failures.length,
      failures,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getBooksBySubject,
  refreshBookMetadata,
  refreshBooksBySubject,
  refreshBooksByMajor,
};
