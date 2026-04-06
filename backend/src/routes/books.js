const router = require('express').Router();
const {
	getBooksBySubject,
	refreshBookMetadata,
	refreshBooksBySubject,
	refreshBooksByMajor,
} = require('../controllers/bookController');

router.post('/:bookId/refresh-metadata', refreshBookMetadata);
router.post('/refresh-metadata/subject/:subjectId', refreshBooksBySubject);
router.post('/refresh-metadata/major/:majorId', refreshBooksByMajor);
router.get('/:subjectId', getBooksBySubject);

module.exports = router;
