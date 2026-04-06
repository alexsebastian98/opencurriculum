const { fetchRepoMarkdownFiles, normalizeRepoUrl } = require('./githubService');
const { extractBooksFromMarkdown } = require('../utils/markdownParser');
const { enrichBookMetadata } = require('./bookMetadataService');
const Book = require('../models/Book');

function toMetadataUpdates(metadata) {
  return {
    author: metadata?.author || 'Unknown Author',
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
  };
}

/**
 * Escapes special regex characters in a string for use in a RegExp constructor.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Orchestrates: fetch markdown files → parse books → deduplicate → persist to DB.
 * Returns { total, saved, books }.
 */
async function extractAndSaveBooks(repoUrl, subjectId) {
  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);
  const files = await fetchRepoMarkdownFiles(normalizedRepoUrl);

  // Collect books from all markdown files
  const allBooks = [];
  for (const file of files) {
    const books = extractBooksFromMarkdown(file.content, {
      repoUrl: normalizedRepoUrl,
      filePath: file.path,
    });
    allBooks.push(...books);
  }

  // Cross-file deduplication by normalised title
  const seen = new Set();
  const uniqueBooks = allBooks.filter((b) => {
    const key = b.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Persist only books not already stored for this subject + repo combination
  const saved = [];
  let updated = 0;
  for (const book of uniqueBooks) {
    const exists = await Book.findOne({
      subject_id: subjectId,
      title: { $regex: new RegExp(`^${escapeRegex(book.title)}$`, 'i') },
    });

    let metadata = null;
    const needsMetadata = !exists || !exists.synopsis || !exists.author_summary || !exists.author;
    if (needsMetadata) {
      metadata = await enrichBookMetadata({
        title: book.title,
        author: book.author,
        isbn_10: exists?.isbn_10,
        isbn_13: exists?.isbn_13,
      });
    }

    if (!exists) {
      const metadataUpdates = toMetadataUpdates(metadata);
      const doc = await Book.create({
        title: book.title,
        author: metadataUpdates.author || book.author || 'Unknown Author',
        subject_id: subjectId,
        source: 'github',
        source_url: normalizedRepoUrl,
        book_url: book.book_url || normalizedRepoUrl,
        isbn_10: metadataUpdates.isbn_10,
        isbn_13: metadataUpdates.isbn_13,
        synopsis: metadataUpdates.synopsis,
        author_summary: metadataUpdates.author_summary,
        metadata_source: metadataUpdates.metadata_source,
        description_source: metadataUpdates.description_source,
        metadata_confidence: metadataUpdates.metadata_confidence,
        metadata_error: metadataUpdates.metadata_error,
        metadata_refreshed_at: metadataUpdates.metadata_refreshed_at,
        metadata_updated_at: metadataUpdates.metadata_updated_at,
      });
      saved.push(doc);
    } else {
      const updates = {};
      if (!exists.author) updates.author = metadata?.author || book.author || 'Unknown Author';
      if (!exists.book_url) updates.book_url = book.book_url || normalizedRepoUrl;
      if (!exists.source_url) updates.source_url = normalizedRepoUrl;
      if (!exists.synopsis && metadata?.synopsis) updates.synopsis = metadata.synopsis;
      if (!exists.author_summary && metadata?.author_summary) updates.author_summary = metadata.author_summary;
      if (!exists.metadata_source && metadata?.metadata_source) updates.metadata_source = metadata.metadata_source;
      if (!exists.metadata_updated_at && metadata?.metadata_updated_at) {
        updates.metadata_updated_at = metadata.metadata_updated_at;
      }
      if (!exists.isbn_10 && metadata?.isbn_10) updates.isbn_10 = metadata.isbn_10;
      if (!exists.isbn_13 && metadata?.isbn_13) updates.isbn_13 = metadata.isbn_13;
      if (!exists.description_source && metadata?.description_source) {
        updates.description_source = metadata.description_source;
      }
      if (!exists.metadata_confidence && metadata?.metadata_confidence) {
        updates.metadata_confidence = metadata.metadata_confidence;
      }
      if ((!exists.metadata_error || exists.metadata_error.length === 0) && metadata?.metadata_error) {
        updates.metadata_error = metadata.metadata_error;
      }
      if (!exists.metadata_refreshed_at && metadata?.metadata_refreshed_at) {
        updates.metadata_refreshed_at = metadata.metadata_refreshed_at;
      }

      if (Object.keys(updates).length > 0) {
        await Book.updateOne({ _id: exists._id }, { $set: updates });
        updated += 1;
      }
    }
  }

  return { total: uniqueBooks.length, saved: saved.length, updated, books: saved };
}

module.exports = { extractAndSaveBooks };
