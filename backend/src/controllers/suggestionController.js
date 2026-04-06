const BookSuggestion = require('../models/BookSuggestion');

function isValidUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function createSuggestion(req, res) {
  try {
    const name = (req.body?.name || '').trim();
    const major = (req.body?.major || '').trim();
    const bookTitle = (req.body?.book_title || '').trim();
    const bookLink = (req.body?.book_link || '').trim();
    const note = (req.body?.note || '').trim();

    if (!major) {
      return res.status(400).json({ error: 'major is required' });
    }

    if (!bookTitle) {
      return res.status(400).json({ error: 'book_title is required' });
    }

    if (!isValidUrl(bookLink)) {
      return res.status(400).json({ error: 'book_link must be a valid http/https URL' });
    }

    const doc = await BookSuggestion.create({
      name,
      major,
      book_title: bookTitle,
      book_link: bookLink,
      note,
      status: 'new',
    });

    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function listSuggestions(req, res) {
  try {
    const limit = Math.min(Number(req.query?.limit || 50), 200);
    const docs = await BookSuggestion.find().sort({ created_at: -1 }).limit(limit);
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { createSuggestion, listSuggestions };
