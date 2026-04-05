const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  author:     { type: String, default: '' },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  source:     { type: String, enum: ['github', 'manual'], default: 'manual' },
  source_url: { type: String, default: '' },
  book_url: { type: String, default: '' },
  synopsis: { type: String, default: '' },
  author_summary: { type: String, default: '' },
  metadata_source: { type: String, default: '' },
  metadata_updated_at: { type: Date, default: null },
});

module.exports = mongoose.model('Book', bookSchema);
