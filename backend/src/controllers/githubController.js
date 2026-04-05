const { extractAndSaveBooks } = require('../services/bookExtractorService');
const { parseRepoUrl } = require('../services/githubService');

async function extractBooks(req, res) {
  const { repoUrl, subjectId } = req.body;

  if (!repoUrl || !subjectId) {
    return res.status(400).json({ error: 'repoUrl and subjectId are required' });
  }

  // Validate repo URL format before hitting the network
  try {
    parseRepoUrl(repoUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid GitHub repository URL' });
  }

  try {
    const result = await extractAndSaveBooks(repoUrl, subjectId);
    res.json(result);
  } catch (err) {
    const status = err.response?.status === 404 ? 404 : 500;
    const message =
      err.response?.status === 404
        ? 'GitHub repository not found or is private'
        : err.response?.status === 403
        ? 'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to .env to increase the limit.'
        : err.message;
    res.status(status).json({ error: message });
  }
}

module.exports = { extractBooks };
