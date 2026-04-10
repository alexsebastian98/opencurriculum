const router = require('express').Router();
const { extractBooks, extractByMajor, getExtractJob } = require('../controllers/githubController');

router.post('/extract-books', extractBooks);
router.post('/extract-by-major', extractByMajor);
router.get('/extract-jobs/:jobId', getExtractJob);

module.exports = router;
