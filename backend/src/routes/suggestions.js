const router = require('express').Router();
const { createSuggestion, listSuggestions } = require('../controllers/suggestionController');

router.post('/', createSuggestion);
router.get('/', listSuggestions);

module.exports = router;
