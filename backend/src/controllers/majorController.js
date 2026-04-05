const Major = require('../models/Major');

async function getMajors(req, res) {
  try {
    const majors = await Major.find().sort({ name: 1 });
    res.json(majors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMajorById(req, res) {
  try {
    const major = await Major.findById(req.params.id);
    if (!major) return res.status(404).json({ error: 'Major not found' });
    res.json(major);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMajors, getMajorById };
