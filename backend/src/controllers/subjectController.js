const Subject = require('../models/Subject');

async function getSubjectsByMajor(req, res) {
  try {
    const subjects = await Subject.find({ major_id: req.params.majorId }).sort({
      year: 1,
      semester: 1,
      name: 1,
    });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSubjectById(req, res) {
  try {
    const subject = await Subject.findById(req.params.subjectId).populate('major_id', 'name');
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSubjectsByMajor, getSubjectById };
