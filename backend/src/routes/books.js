const router = require('express').Router();
const { getBooksBySubject } = require('../controllers/bookController');

router.get('/:subjectId', getBooksBySubject);

module.exports = router;
