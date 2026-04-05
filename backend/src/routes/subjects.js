const router = require('express').Router();
const { getSubjectsByMajor, getSubjectById } = require('../controllers/subjectController');

// Must come before /:majorId to avoid routing collision
router.get('/detail/:subjectId', getSubjectById);
router.get('/:majorId', getSubjectsByMajor);

module.exports = router;
