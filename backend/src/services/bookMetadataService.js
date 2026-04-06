const axios = require('axios');
const cache = require('../utils/cache');

const OPEN_LIBRARY_TIMEOUT = 8000;

function uniqueNonEmpty(values) {
  return Array.from(new Set(values.map((v) => (v || '').trim()).filter(Boolean)));
}

function normalizeTitleForSearch(title) {
  if (!title) return '';

  return String(title)
    .replace(/\s*\([^)]*edition[^)]*\)/gi, '')
    .replace(/\s*\([^)]*ed\.?(ition)?[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*edition[^\]]*\]/gi, '')
    .replace(/\s*\[[^\]]*ed\.?(ition)?[^\]]*\]/gi, '')
    .replace(/\s*-\s*(international|student|global|revised|updated)\s+edition/gi, '')
    .replace(/\s*[:\-]\s*(\d+(st|nd|rd|th)\s+)?ed(ition)?\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTitleCandidates(title) {
  const normalized = normalizeTitleForSearch(title);
  const beforeColon = normalized.split(':')[0].trim();
  const beforeDash = normalized.split(' - ')[0].trim();

  return uniqueNonEmpty([title, normalized, beforeColon, beforeDash]);
}

function normalizeIsbn(value) {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^0-9X]/g, '');
}

function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const char = isbn[i];
    const digit = char === 'X' ? 10 : Number(char);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const digit = Number(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

function convertIsbn10To13(isbn10) {
  if (!isValidIsbn10(isbn10)) return '';
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < core.length; i += 1) {
    const digit = Number(core[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${core}${checkDigit}`;
}

function getCanonicalIsbnPair({ isbn_10, isbn_13 }) {
  const normalized10 = normalizeIsbn(isbn_10);
  const normalized13 = normalizeIsbn(isbn_13);

  const valid10 = isValidIsbn10(normalized10) ? normalized10 : '';
  let valid13 = isValidIsbn13(normalized13) ? normalized13 : '';

  if (!valid13 && valid10) {
    valid13 = convertIsbn10To13(valid10);
  }

  return { isbn10: valid10, isbn13: valid13 };
}

function parseNotes(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.value) return value.value;
  return '';
}

function parseExcerpts(excerpts) {
  if (!Array.isArray(excerpts) || excerpts.length === 0) return '';
  const first = excerpts[0];
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first.excerpt) return parseNotes(first.excerpt);
  return '';
}

function extractOpenLibraryIsbns(data) {
  const raw10 = data?.identifiers?.isbn_10?.[0] || '';
  const raw13 = data?.identifiers?.isbn_13?.[0] || '';
  const canonical = getCanonicalIsbnPair({ isbn_10: raw10, isbn_13: raw13 });
  return {
    isbn_10: canonical.isbn10,
    isbn_13: canonical.isbn13,
  };
}

function cleanText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength) {
  if (!value) return '';
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
}

function buildFallbackSynopsis(title) {
  const base = `A reference text focused on ${title}, useful for structured academic study and topic review.`;
  return truncateText(base, 320);
}

function buildFallbackAuthorSummary(author) {
  if (author) {
    return truncateText(`${author} is listed as the author of this referenced academic text.`, 280);
  }
  return 'Author information is not specified in the available source metadata.';
}

function normalizeAuthorInput(author) {
  const normalized = (author || '').trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'unknown author') return '';
  return normalized;
}

function getOpenLibraryFirstSentence(doc) {
  if (!doc || !doc.first_sentence) return '';
  if (typeof doc.first_sentence === 'string') return doc.first_sentence;
  if (typeof doc.first_sentence === 'object' && doc.first_sentence.value) {
    return doc.first_sentence.value;
  }
  return '';
}

async function fetchOpenLibraryMetadata(title, author) {
  const cleanAuthor = normalizeAuthorInput(author);
  const titleCandidates = buildTitleCandidates(title);
  let doc = null;

  for (const candidate of titleCandidates) {
    const queries = [];

    const withAuthor = new URLSearchParams({
      title: candidate,
      limit: '3',
    });
    if (cleanAuthor) withAuthor.append('author', cleanAuthor);
    queries.push(withAuthor);

    if (cleanAuthor) {
      queries.push(
        new URLSearchParams({
          title: candidate,
          limit: '3',
        })
      );
    }

    for (const params of queries) {
      const searchUrl = `https://openlibrary.org/search.json?${params.toString()}`;
      const response = await axios.get(searchUrl, { timeout: OPEN_LIBRARY_TIMEOUT });
      const docs = response.data?.docs || [];
      if (docs.length > 0) {
        doc = docs[0];
        break;
      }
    }

    if (doc) break;
  }

  if (!doc) return null;

  const synopsis = getOpenLibraryFirstSentence(doc);
  const inferredAuthor = cleanAuthor || doc.author_name?.[0] || '';

  let authorSummary = '';
  const authorKey = doc.author_key?.[0];
  if (authorKey) {
    try {
      const authorResp = await axios.get(`https://openlibrary.org/authors/${authorKey}.json`, {
        timeout: OPEN_LIBRARY_TIMEOUT,
      });
      const bio = authorResp.data?.bio;
      if (typeof bio === 'string') authorSummary = bio;
      if (typeof bio === 'object' && bio?.value) authorSummary = bio.value;
    } catch {
      // Keep graceful fallback when author profile fetch fails
    }
  }

  return {
    synopsis: truncateText(synopsis, 320),
    author_summary: truncateText(authorSummary, 280),
    metadata_source: 'openlibrary',
    description_source: 'title-author',
    metadata_confidence: 75,
    author: inferredAuthor,
    metadata_error: '',
    ...extractOpenLibraryIsbns(doc),
  };
}

async function fetchGoogleBooksMetadata(title, author) {
  const cleanAuthor = normalizeAuthorInput(author);
  const titleCandidates = buildTitleCandidates(title);

  for (const candidate of titleCandidates) {
    const parts = [`intitle:${candidate}`];
    if (cleanAuthor) parts.push(`inauthor:${cleanAuthor}`);
    const q = parts.join(' ');

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1&printType=books`;
    const response = await axios.get(url, { timeout: OPEN_LIBRARY_TIMEOUT });
    const item = response.data?.items?.[0];
    const volume = item?.volumeInfo;
    if (!volume) continue;

    const industryIds = volume.industryIdentifiers || [];
    const isbn10 = industryIds.find((i) => i.type === 'ISBN_10')?.identifier || '';
    const isbn13 = industryIds.find((i) => i.type === 'ISBN_13')?.identifier || '';
    const canonical = getCanonicalIsbnPair({ isbn_10: isbn10, isbn_13: isbn13 });

    return {
      synopsis: truncateText(volume.description || '', 320),
      author_summary: '',
      metadata_source: 'google-books',
      description_source: 'title-author',
      metadata_confidence: 70,
      author: cleanAuthor || volume.authors?.[0] || '',
      metadata_error: '',
      isbn_10: canonical.isbn10,
      isbn_13: canonical.isbn13,
    };
  }

  return null;
}

async function fetchOpenLibraryMetadataByIsbn(isbn) {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
  const response = await axios.get(url, { timeout: OPEN_LIBRARY_TIMEOUT });
  const key = `ISBN:${isbn}`;
  const data = response.data?.[key];
  if (!data) return null;

  const synopsis = parseNotes(data.notes) || parseExcerpts(data.excerpts);
  const author = data.authors?.[0]?.name || '';

  return {
    synopsis: truncateText(synopsis, 320),
    author_summary: '',
    metadata_source: 'openlibrary-isbn',
    description_source: 'isbn',
    metadata_confidence: 95,
    author,
    metadata_error: '',
    ...extractOpenLibraryIsbns(data),
  };
}

async function fetchWikipediaSummary(query) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    timeout: OPEN_LIBRARY_TIMEOUT,
    headers: { Accept: 'application/json' },
  });
  return truncateText(response.data?.extract || '', 320);
}

/**
 * Enriches book metadata using external APIs.
 * Returns empty values when metadata is unavailable.
 */
async function enrichBookMetadata({ title, author, isbn_10, isbn_13 }) {
  const cleanAuthor = normalizeAuthorInput(author);
  const canonicalIsbn = getCanonicalIsbnPair({ isbn_10, isbn_13 });
  const cacheKey = canonicalIsbn.isbn13
    ? `book-metadata:isbn:${canonicalIsbn.isbn13}`
    : `book-metadata:title:${title.toLowerCase()}|${cleanAuthor.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fallback = {
    synopsis: '',
    author_summary: '',
    metadata_source: '',
    description_source: '',
    metadata_confidence: 0,
    metadata_error: '',
    metadata_refreshed_at: null,
    metadata_updated_at: null,
    author: cleanAuthor || '',
    isbn_10: canonicalIsbn.isbn10,
    isbn_13: canonicalIsbn.isbn13,
  };

  let metadata = { ...fallback };
  let lastError = '';

  if (canonicalIsbn.isbn13 || canonicalIsbn.isbn10) {
    try {
      const isbnMetadata = await fetchOpenLibraryMetadataByIsbn(canonicalIsbn.isbn13 || canonicalIsbn.isbn10);
      if (isbnMetadata) {
        metadata = {
          ...metadata,
          ...isbnMetadata,
        };
      }
    } catch (err) {
      lastError = err?.message || 'ISBN metadata lookup failed';
    }
  }

  if (!metadata.synopsis || !metadata.author) {
    try {
      const openLibrary = await fetchOpenLibraryMetadata(title, cleanAuthor);
      if (openLibrary) {
        metadata = {
          ...metadata,
          ...openLibrary,
          synopsis: metadata.synopsis || openLibrary.synopsis,
        };
      }
    } catch (err) {
      lastError = err?.message || 'Title metadata lookup failed';
    }
  }

  if (!metadata.synopsis || !metadata.author) {
    try {
      const googleBooks = await fetchGoogleBooksMetadata(title, cleanAuthor);
      if (googleBooks) {
        metadata = {
          ...metadata,
          ...googleBooks,
          synopsis: metadata.synopsis || googleBooks.synopsis,
        };
      }
    } catch (err) {
      lastError = err?.message || 'Google Books metadata lookup failed';
    }
  }

  if (!metadata.synopsis) {
    try {
      const wikiBook = await fetchWikipediaSummary(`${title} book`);
      if (wikiBook) {
        metadata.synopsis = wikiBook;
        metadata.metadata_source = metadata.metadata_source || 'wikipedia';
        metadata.description_source = metadata.description_source || 'wikipedia';
        metadata.metadata_confidence = Math.max(metadata.metadata_confidence, 60);
      }
    } catch (err) {
      lastError = err?.message || 'Wikipedia summary lookup failed';
    }
  }

  if (!metadata.author_summary && metadata.author) {
    try {
      const wikiAuthor = await fetchWikipediaSummary(metadata.author);
      if (wikiAuthor) {
        metadata.author_summary = truncateText(wikiAuthor, 280);
        metadata.metadata_source = metadata.metadata_source || 'wikipedia';
        metadata.metadata_confidence = Math.max(metadata.metadata_confidence, 60);
      }
    } catch (err) {
      lastError = err?.message || 'Wikipedia author lookup failed';
    }
  }

  if (!metadata.synopsis) {
    metadata.synopsis = buildFallbackSynopsis(title);
    metadata.metadata_source = metadata.metadata_source || 'generated';
    metadata.description_source = metadata.description_source || 'generated';
    metadata.metadata_confidence = Math.max(metadata.metadata_confidence, 30);
  }

  if (!metadata.author_summary) {
    metadata.author_summary = buildFallbackAuthorSummary(metadata.author || cleanAuthor);
    metadata.metadata_source = metadata.metadata_source || 'generated';
    metadata.metadata_confidence = Math.max(metadata.metadata_confidence, 30);
  }

  if (metadata.metadata_source && (metadata.synopsis || metadata.author)) {
    metadata.metadata_error = '';
  } else if (lastError) {
    metadata.metadata_error = lastError;
  }

  metadata.metadata_updated_at = metadata.metadata_source ? new Date() : null;
  metadata.metadata_refreshed_at = metadata.metadata_updated_at;
  if (!metadata.author) metadata.author = 'Unknown Author';
  cache.set(cacheKey, metadata, 60 * 60 * 24);
  return metadata;
}

module.exports = { enrichBookMetadata };
