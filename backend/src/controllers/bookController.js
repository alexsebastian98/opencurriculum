const Book = require('../models/Book');

async function getBooksBySubject(req, res) {
  try {
    const books = await Book.find({ subject_id: req.params.subjectId }).sort({ title: 1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getBooksBySubject };
