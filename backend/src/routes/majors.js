const router = require('express').Router();
const { getMajors, getMajorById } = require('../controllers/majorController');

router.get('/', getMajors);
router.get('/:id', getMajorById);

module.exports = router;
