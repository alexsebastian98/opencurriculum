const axios = require('axios');
const cache = require('../utils/cache');

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

function getOpenLibraryFirstSentence(doc) {
  if (!doc || !doc.first_sentence) return '';
  if (typeof doc.first_sentence === 'string') return doc.first_sentence;
  if (typeof doc.first_sentence === 'object' && doc.first_sentence.value) {
    return doc.first_sentence.value;
  }
  return '';
}

async function fetchOpenLibraryMetadata(title, author) {
  const params = new URLSearchParams({
    title,
    limit: '1',
  });

  if (author) params.append('author', author);

  const searchUrl = `https://openlibrary.org/search.json?${params.toString()}`;
  const response = await axios.get(searchUrl, { timeout: 8000 });
  const doc = response.data?.docs?.[0];
  if (!doc) return null;

  const synopsis = getOpenLibraryFirstSentence(doc);
  const inferredAuthor = author || doc.author_name?.[0] || '';

  let authorSummary = '';
  const authorKey = doc.author_key?.[0];
  if (authorKey) {
    try {
      const authorResp = await axios.get(`https://openlibrary.org/authors/${authorKey}.json`, {
        timeout: 8000,
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
    author: inferredAuthor,
  };
}

async function fetchWikipediaSummary(query) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    timeout: 8000,
    headers: { Accept: 'application/json' },
  });
  return truncateText(response.data?.extract || '', 320);
}

/**
 * Enriches book metadata using external APIs.
 * Returns empty values when metadata is unavailable.
 */
async function enrichBookMetadata({ title, author }) {
  const cacheKey = `book-metadata:${title.toLowerCase()}|${(author || '').toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fallback = {
    synopsis: '',
    author_summary: '',
    metadata_source: '',
    metadata_updated_at: null,
    author: author || '',
  };

  let metadata = { ...fallback };

  try {
    const openLibrary = await fetchOpenLibraryMetadata(title, author);
    if (openLibrary) {
      metadata = {
        ...metadata,
        ...openLibrary,
      };
    }
  } catch {
    // Fall through to Wikipedia fallback
  }

  if (!metadata.synopsis) {
    try {
      const wikiBook = await fetchWikipediaSummary(`${title} book`);
      if (wikiBook) {
        metadata.synopsis = wikiBook;
        metadata.metadata_source = metadata.metadata_source || 'wikipedia';
      }
    } catch {
      // Keep empty synopsis if unavailable
    }
  }

  if (!metadata.author_summary && metadata.author) {
    try {
      const wikiAuthor = await fetchWikipediaSummary(metadata.author);
      if (wikiAuthor) {
        metadata.author_summary = truncateText(wikiAuthor, 280);
        metadata.metadata_source = metadata.metadata_source || 'wikipedia';
      }
    } catch {
      // Keep empty author summary if unavailable
    }
  }

  if (!metadata.synopsis) {
    metadata.synopsis = buildFallbackSynopsis(title);
    metadata.metadata_source = metadata.metadata_source || 'generated';
  }

  if (!metadata.author_summary) {
    metadata.author_summary = buildFallbackAuthorSummary(metadata.author || author);
    metadata.metadata_source = metadata.metadata_source || 'generated';
  }

  metadata.metadata_updated_at = metadata.metadata_source ? new Date() : null;
  cache.set(cacheKey, metadata, 60 * 60 * 24);
  return metadata;
}

module.exports = { enrichBookMetadata };
