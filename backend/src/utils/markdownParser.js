/**
 * markdownParser.js
 * Non-AI regex-based extraction of book titles and authors from markdown text.
 * Returns { title, author, section, book_url } so callers can use section context.
 */

const path = require('path');

// Ordered regex patterns to match a book entry line.
// Each pattern must capture (title, author) in groups 1 and 2.
const BOOK_PATTERNS = [
  // * Title – Author  /  * Title — Author  /  * Title - Author
  /^[*\-•]\s+(.+?)\s+[–—]\s+(.+)$/,
  /^[*\-•]\s+(.+?)\s+-\s+(.+)$/,
  // * Title by Author
  /^[*\-•]\s+(.+?)\s+[Bb]y\s+(.+)$/,
  // 1. Title – Author
  /^\d+\.\s+(.+?)\s+[–—]\s+(.+)$/,
  /^\d+\.\s+(.+?)\s+-\s+(.+)$/,
  // 1. Title by Author
  /^\d+\.\s+(.+?)\s+[Bb]y\s+(.+)$/,
  // **Title** by Author  or  **Title** - Author
  /\*\*(.+?)\*\*\s+(?:[Bb]y\s+)?(.+)$/,
  // "Title" by Author
  /"(.+?)"\s+[Bb]y\s+(.+)$/,
];

// HTML/Markdown link patterns where the anchor text itself is the book title.
const HTML_BOOK_LINK_PATTERN = /<a[^>]+href=["']([^"']+\.(?:pdf|epub|djvu|mobi)[^"']*)["'][^>]*>(.*?)<\/a>/i;
const MD_BOOK_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+\.(?:pdf|epub|djvu|mobi)[^)]+)\)/i;

/**
 * Strips markdown syntax from a single line, returning plain text.
 */
function stripMarkdownLine(line) {
  return line
    .replace(/!\[.*?\]\(.*?\)/g, '')            // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // links → label text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')          // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')             // italic
    .replace(/`[^`]+`/g, '')                     // inline code
    .replace(/^#{1,6}\s+/, '')                   // headings
    .replace(/^>\s+/, '')                        // blockquotes
    .trim();
}

/**
 * Splits markdown text into sections delimited by headings.
 * Returns all sections so the caller can use heading context when assigning books.
 */
function extractSections(text) {
  // Strip fenced code blocks first to avoid false positives
  const cleaned = text.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
  const lines = cleaned.split('\n');

  const sections = [];
  let current = null;

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#{1,4}\s+/, '').trim(), lines: [] };
    } else {
      if (current) current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.length > 0 ? sections : [{ heading: 'document', lines }];
}

/**
 * Cleans a captured group — removes leftover markdown symbols and trims.
 */
function cleanCapture(str) {
  return str
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\(https?:\/\/[^)]+\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getRepoBase(repoUrl) {
  const match = (repoUrl || '').match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return '';
  return `https://github.com/${match[1]}/${match[2].replace(/\.git$/i, '')}`;
}

function resolveRelativePath(filePath, linkPath) {
  const cleanLink = linkPath.replace(/^\.\//, '');
  if (!filePath) return cleanLink;
  const dir = path.posix.dirname(filePath);
  return path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, cleanLink));
}

function normalizeBookUrl(rawUrl, options = {}) {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;

  const repoBase = getRepoBase(options.repoUrl);
  if (!repoBase) return trimmed;

  if (trimmed.startsWith('/')) {
    return `${repoBase}/blob/master${trimmed}`;
  }

  const relativePath = resolveRelativePath(options.filePath, trimmed);
  return `${repoBase}/blob/master/${relativePath}`;
}

/**
 * Extracts a title from HTML/Markdown links that point to book files.
 * Returns null if line doesn't match a supported link pattern.
 */
function parseLinkedBookTitle(rawLine, options = {}) {
  const htmlMatch = HTML_BOOK_LINK_PATTERN.exec(rawLine);
  if (htmlMatch) {
    const bookUrl = normalizeBookUrl(htmlMatch[1], options);
    const title = cleanCapture(htmlMatch[2]);
    if (title.length >= 3) return { title, author: '', book_url: bookUrl };
  }

  const mdMatch = MD_BOOK_LINK_PATTERN.exec(rawLine);
  if (mdMatch) {
    const title = cleanCapture(mdMatch[1]);
    const bookUrl = normalizeBookUrl(mdMatch[2], options);
    if (title.length >= 3) return { title, author: '', book_url: bookUrl };
  }

  return null;
}

/**
 * Attempts to extract a {title, author} pair from a single plain-text line.
 * Returns null if no pattern matches.
 */
function parseLine(line) {
  if (!line || line.length < 5) return null;

  for (const pattern of BOOK_PATTERNS) {
    const match = pattern.exec(line);
    if (match) {
      const title = cleanCapture(match[1]);
      const author = cleanCapture(match[2]);
      if (title.length >= 3) {
        return { title, author };
      }
    }
  }
  return null;
}

/**
 * Deduplicates a book array by normalised title.
 */
function deduplicateBooks(books) {
  const seen = new Set();
  return books.filter((book) => {
    const key = book.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main export. Takes a raw markdown string, returns a deduplicated array of
 * { title: string, author: string, section: string, book_url: string } objects.
 */
function extractBooksFromMarkdown(markdownText, options = {}) {
  const sections = extractSections(markdownText);
  const allBooks = [];

  for (const section of sections) {
    for (const rawLine of section.lines) {
      // First, try direct extraction from book file links (common in HTML-style READMEs).
      const linkedBook = parseLinkedBookTitle(rawLine, options);
      if (linkedBook) {
        allBooks.push({ ...linkedBook, section: section.heading });
        continue;
      }

      const plain = stripMarkdownLine(rawLine);
      const book = parseLine(plain);
      if (book) allBooks.push({ ...book, section: section.heading, book_url: '' });
    }
  }

  return deduplicateBooks(allBooks);
}

module.exports = { extractBooksFromMarkdown };
