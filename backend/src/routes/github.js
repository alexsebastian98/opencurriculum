const router = require('express').Router();
const { extractBooks, extractByMajor } = require('../controllers/githubController');

router.post('/extract-books', extractBooks);
router.post('/extract-by-major', extractByMajor);

module.exports = router;
