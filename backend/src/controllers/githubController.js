const { extractAndSaveBooks } = require('../services/bookExtractorService');
const {
  parseRepoUrl,
  fetchRepoMarkdownFiles,
  fetchRepoRootBookFiles,
  normalizeRepoUrl,
} = require('../services/githubService');
const { extractBooksFromMarkdown } = require('../utils/markdownParser');
const { assignBooksToSubjects } = require('../utils/subjectMatcher');
const { enrichBookMetadata } = require('../services/bookMetadataService');
const Major = require('../models/Major');
const Subject = require('../models/Subject');
const Book = require('../models/Book');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function extractByMajor(req, res) {
  const { repoUrl, majorName } = req.body;
  if (!repoUrl || !majorName) {
    return res.status(400).json({ error: 'repoUrl and majorName are required' });
  }

  const major = await Major.findOne({
    name: new RegExp(`^${escapeRegex(majorName)}$`, 'i'),
  });
  if (!major) {
    return res.status(404).json({ error: `Major not found: ${majorName}` });
  }

  const subjects = await Subject.find({ major_id: major._id });
  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);

  const files = await fetchRepoMarkdownFiles(normalizedRepoUrl);
  const allBooks = [];
  const seenTitles = new Set();
  for (const file of files) {
    for (const book of extractBooksFromMarkdown(file.content, {
      repoUrl: normalizedRepoUrl,
      filePath: file.path,
    })) {
      const key = book.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seenTitles.has(key)) { seenTitles.add(key); allBooks.push(book); }
    }
  }
  if (allBooks.length === 0) {
    const fileBooks = await fetchRepoRootBookFiles(normalizedRepoUrl);
    for (const book of fileBooks) {
      const key = book.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seenTitles.has(key)) { seenTitles.add(key); allBooks.push(book); }
    }
  }

  const assignments = assignBooksToSubjects(allBooks, subjects);
  let totalSaved = 0;

  for (const [subjectId, books] of assignments) {
    for (const book of books) {
      const exists = await Book.findOne({
        subject_id: subjectId,
        title: { $regex: new RegExp(`^${escapeRegex(book.title)}$`, 'i') },
      });
      if (!exists) {
        let metadata = null;
        try {
          metadata = await enrichBookMetadata({ title: book.title, author: book.author });
        } catch (_) {}
        await Book.create({
          title: book.title,
          author: metadata?.author || book.author || 'Unknown Author',
          subject_id: subjectId,
          source: 'github',
          source_url: normalizedRepoUrl,
          book_url: book.book_url || normalizedRepoUrl,
          isbn_10: metadata?.isbn_10 || '',
          isbn_13: metadata?.isbn_13 || '',
          synopsis: metadata?.synopsis || '',
          author_summary: metadata?.author_summary || '',
          metadata_source: metadata?.metadata_source || '',
          description_source: metadata?.description_source || '',
          metadata_confidence: metadata?.metadata_confidence || 0,
          metadata_error: metadata?.metadata_error || '',
          metadata_refreshed_at: metadata?.metadata_refreshed_at || null,
          metadata_updated_at: metadata?.metadata_updated_at || null,
        });
        totalSaved++;
      }
    }
  }

  res.json({
    major: major.name,
    repo: normalizedRepoUrl,
    booksExtracted: allBooks.length,
    booksSaved: totalSaved,
  });
}

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

module.exports = { extractBooks, extractByMajor };
