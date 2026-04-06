const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  author:     { type: String, default: '' },
  isbn_10:    { type: String, default: '' },
  isbn_13:    { type: String, default: '' },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  source:     { type: String, enum: ['github', 'manual'], default: 'manual' },
  source_url: { type: String, default: '' },
  book_url: { type: String, default: '' },
  synopsis: { type: String, default: '' },
  author_summary: { type: String, default: '' },
  metadata_source: { type: String, default: '' },
  description_source: { type: String, default: '' },
  metadata_confidence: { type: Number, default: 0, min: 0, max: 100 },
  metadata_error: { type: String, default: '' },
  metadata_refreshed_at: { type: Date, default: null },
  metadata_version: { type: Number, default: 1 },
  metadata_updated_at: { type: Date, default: null },
});

bookSchema.index({ isbn_13: 1 });
bookSchema.index({ subject_id: 1, title: 1 });

module.exports = mongoose.model('Book', bookSchema);
