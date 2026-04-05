const router = require('express').Router();
const { extractBooks } = require('../controllers/githubController');

router.post('/extract-books', extractBooks);

module.exports = router;
