const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  major_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true },
  year:      { type: Number, required: true },
  semester:  { type: Number, required: true },
});

module.exports = mongoose.model('Subject', subjectSchema);
