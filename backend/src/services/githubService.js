const axios = require('axios');
const cache = require('../utils/cache');

/**
 * Builds GitHub API request headers.
 * Attaches GITHUB_TOKEN if provided (5 000 req/hr vs 60 req/hr unauthenticated).
 */
function makeHeaders() {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Normalizes GitHub URLs to repository root form:
 * https://github.com/{owner}/{repo}
 */
function normalizeRepoUrl(repoUrl) {
  const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) throw new Error('Invalid GitHub repository URL');
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');
  return `https://github.com/${owner}/${repo}`;
}

/**
 * Parses a GitHub URL and returns { owner, repo }.
 * Throws on invalid URL.
 */
function parseRepoUrl(repoUrl) {
  const normalized = normalizeRepoUrl(repoUrl);
  const match = normalized.match(/github\.com\/([^/]+)\/([^/]+)$/i);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetches the decoded text content of a single file via the GitHub Contents API.
 * Results are cached.
 */
async function fetchFileContent(owner, repo, path) {
  const cacheKey = `file:${owner}/${repo}/${path}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const response = await axios.get(url, { headers: makeHeaders(), timeout: 10000 });
  const content = Buffer.from(response.data.content, 'base64').toString('utf8');
  cache.set(cacheKey, content);
  return content;
}

/**
 * Fetches all markdown files (README + *.md) from the root of a repo.
 * Returns an array of { path, content } objects (max 10 files).
 * Results are cached.
 */
async function fetchRepoMarkdownFiles(repoUrl) {
  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);
  const { owner, repo } = parseRepoUrl(normalizedRepoUrl);
  const cacheKey = `repo:${owner}/${repo}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
  const response = await axios.get(contentsUrl, { headers: makeHeaders(), timeout: 10000 });

  const mdFiles = response.data
    .filter((f) => f.type === 'file' && f.name.toLowerCase().endsWith('.md'))
    .slice(0, 10);

  const contents = [];
  for (const file of mdFiles) {
    try {
      const content = await fetchFileContent(owner, repo, file.path);
      contents.push({ path: file.path, content });
    } catch {
      // Skip files that fail; don't abort the whole extraction
    }
  }

  cache.set(cacheKey, contents);
  return contents;
}

function fileNameToTitle(name) {
  return name
    .replace(/\.(pdf|epub|djvu|mobi|chm)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback extractor: reads root-level book files from a repo and maps them into
 * { title, author, section, book_url } entries.
 */
async function fetchRepoRootBookFiles(repoUrl) {
  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);
  const { owner, repo } = parseRepoUrl(normalizedRepoUrl);
  const cacheKey = `repo-files:${owner}/${repo}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
  const response = await axios.get(contentsUrl, { headers: makeHeaders(), timeout: 10000 });

  const books = response.data
    .filter(
      (f) =>
        f.type === 'file' &&
        /\.(pdf|epub|djvu|mobi|chm)$/i.test(f.name) &&
        !/^readme\./i.test(f.name) &&
        !/^license$/i.test(f.name)
    )
    .map((f) => ({
      title: fileNameToTitle(f.name),
      author: '',
      section: 'root-files',
      book_url: `${normalizedRepoUrl}/blob/master/${f.path}`,
    }));

  cache.set(cacheKey, books);
  return books;
}

module.exports = {
  fetchRepoMarkdownFiles,
  fetchRepoRootBookFiles,
  parseRepoUrl,
  normalizeRepoUrl,
};
