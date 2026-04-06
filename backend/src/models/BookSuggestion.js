const mongoose = require('mongoose');

const bookSuggestionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, default: '' },
    major: { type: String, required: true, trim: true, maxlength: 120 },
    book_title: { type: String, required: true, trim: true, maxlength: 220 },
    book_link: { type: String, trim: true, maxlength: 500, default: '' },
    note: { type: String, trim: true, maxlength: 1200, default: '' },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'approved', 'rejected'],
      default: 'new',
    },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

bookSuggestionSchema.index({ created_at: -1 });
bookSuggestionSchema.index({ major: 1, status: 1 });

module.exports = mongoose.model('BookSuggestion', bookSuggestionSchema);
