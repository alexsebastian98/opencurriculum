const { extractAndSaveBooks } = require('../services/bookExtractorService');
const {
  parseRepoUrl,
  fetchRepoMarkdownFiles,
  fetchRepoRootBookFiles,
  normalizeRepoUrl,
} = require('../services/githubService');
const { extractBooksFromMarkdown } = require('../utils/markdownParser');
const { assignBooksToSubjects } = require('../utils/subjectMatcher');
const Major = require('../models/Major');
const Subject = require('../models/Subject');
const Book = require('../models/Book');
const { randomUUID } = require('crypto');

const extractJobs = new Map();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runExtractByMajor(repoUrl, majorName) {
  const major = await Major.findOne({
    name: new RegExp(`^${escapeRegex(majorName)}$`, 'i'),
  });
  if (!major) {
    const error = new Error(`Major not found: ${majorName}`);
    error.status = 404;
    throw error;
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

  for (const [subjectId, entry] of assignments) {
    for (const book of entry.books) {
      const exists = await Book.findOne({
        subject_id: subjectId,
        title: { $regex: new RegExp(`^${escapeRegex(book.title)}$`, 'i') },
      });
      if (!exists) {
        await Book.create({
          title: book.title,
          author: book.author || 'Unknown Author',
          subject_id: subjectId,
          source: 'github',
          source_url: normalizedRepoUrl,
          book_url: book.book_url || normalizedRepoUrl,
          isbn_10: '',
          isbn_13: '',
          synopsis: '',
          author_summary: '',
          metadata_source: '',
          description_source: '',
          metadata_confidence: 0,
          metadata_error: '',
          metadata_refreshed_at: null,
          metadata_updated_at: null,
        });
        totalSaved++;
      }
    }
  }

  return {
    major: major.name,
    repo: normalizedRepoUrl,
    booksExtracted: allBooks.length,
    booksSaved: totalSaved,
  };
}

async function extractByMajor(req, res) {
  const { repoUrl, majorName } = req.body;
  if (!repoUrl || !majorName) {
    return res.status(400).json({ error: 'repoUrl and majorName are required' });
  }

  try {
    parseRepoUrl(repoUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid GitHub repository URL' });
  }

  const jobId = randomUUID();
  extractJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    repoUrl,
    majorName,
    startedAt: new Date().toISOString(),
  });

  setImmediate(async () => {
    extractJobs.set(jobId, {
      ...extractJobs.get(jobId),
      status: 'running',
    });

    try {
      const result = await runExtractByMajor(repoUrl, majorName);
      extractJobs.set(jobId, {
        ...extractJobs.get(jobId),
        status: 'completed',
        completedAt: new Date().toISOString(),
        result,
      });
    } catch (err) {
      extractJobs.set(jobId, {
        ...extractJobs.get(jobId),
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: err.message,
      });
    }
  });

  res.status(202).json({
    jobId,
    status: 'queued',
    majorName,
    repoUrl,
  });
}

function getExtractJob(req, res) {
  const job = extractJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
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

module.exports = { extractBooks, extractByMajor, getExtractJob };
