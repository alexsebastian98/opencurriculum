/**
 * adminExtract.js
 * Admin CLI: fetch a GitHub repo, auto-match books to subjects, save to DB.
 *
 * Usage:
 *   node src/adminExtract.js --repo <github-url> --major <major-name>
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Major = require('./models/Major');
const Subject = require('./models/Subject');
const Book = require('./models/Book');
const {
  fetchRepoMarkdownFiles,
  fetchRepoRootBookFiles,
  normalizeRepoUrl,
} = require('./services/githubService');
const { extractBooksFromMarkdown } = require('./utils/markdownParser');
const { assignBooksToSubjects } = require('./utils/subjectMatcher');
const { enrichBookMetadata } = require('./services/bookMetadataService');

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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function run() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const repoUrl = get('--repo');
  const majorName = get('--major');

  if (!repoUrl || !majorName) {
    console.error('Usage: node src/adminExtract.js --repo <url> --major <name>');
    process.exit(1);
  }

  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);

  await connectDB();

  const major = await Major.findOne({
    name: new RegExp(`^${escapeRegex(majorName)}$`, 'i'),
  });

  if (!major) {
    console.error(`Major not found: "${majorName}"`);
    console.log('Available majors:');
    const all = await Major.find().select('name').sort({ name: 1 });
    all.forEach((m) => console.log(` - ${m.name}`));
    process.exit(1);
  }

  const subjects = await Subject.find({ major_id: major._id }).sort({
    year: 1,
    semester: 1,
    name: 1,
  });

  console.log(`Major: ${major.name} - ${subjects.length} subjects loaded`);
  console.log(`Fetching markdown from ${normalizedRepoUrl} ...`);

  const files = await fetchRepoMarkdownFiles(normalizedRepoUrl);
  console.log(`Found ${files.length} markdown file(s)`);

  const allBooks = [];
  const seenTitles = new Set();
  for (const file of files) {
    for (const book of extractBooksFromMarkdown(file.content, {
      repoUrl: normalizedRepoUrl,
      filePath: file.path,
    })) {
      const key = `${book.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${(book.author || '').toLowerCase()}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allBooks.push(book);
      }
    }
  }

  if (allBooks.length === 0) {
    const fileBooks = await fetchRepoRootBookFiles(normalizedRepoUrl);
    for (const book of fileBooks) {
      const key = `${book.title.toLowerCase().replace(/\s+/g, ' ').trim()}|${(book.author || '').toLowerCase()}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allBooks.push(book);
      }
    }
    console.log(`Markdown had no extractable list; used root-file fallback (${fileBooks.length} file book(s)).`);
  }

  console.log(`Extracted ${allBooks.length} unique book(s) from markdown`);

  const assignments = assignBooksToSubjects(allBooks, subjects);

  if (assignments.size === 0) {
    console.log('No books matched subjects confidently.');
    await mongoose.connection.close();
    return;
  }

  let totalSaved = 0;
  let totalUpdated = 0;

  for (const [, { subject, books }] of assignments) {
    let saved = 0;
    let updated = 0;

    for (const book of books) {
      const exists = await Book.findOne({
        subject_id: subject._id,
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
        await Book.create({
          title: book.title,
          author: metadataUpdates.author || book.author || 'Unknown Author',
          subject_id: subject._id,
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
        saved += 1;
      } else {
        const updates = {};
        if (!exists.author) {
          updates.author = metadata?.author || book.author || 'Unknown Author';
        }
        if (!exists.book_url) {
          updates.book_url = book.book_url || normalizedRepoUrl;
        }
        if (!exists.source_url) {
          updates.source_url = normalizedRepoUrl;
        }
        if (!exists.synopsis && metadata?.synopsis) {
          updates.synopsis = metadata.synopsis;
        }
        if (!exists.author_summary && metadata?.author_summary) {
          updates.author_summary = metadata.author_summary;
        }
        if (!exists.metadata_source && metadata?.metadata_source) {
          updates.metadata_source = metadata.metadata_source;
        }
        if (!exists.metadata_updated_at && metadata?.metadata_updated_at) {
          updates.metadata_updated_at = metadata.metadata_updated_at;
        }
        if (!exists.isbn_10 && metadata?.isbn_10) {
          updates.isbn_10 = metadata.isbn_10;
        }
        if (!exists.isbn_13 && metadata?.isbn_13) {
          updates.isbn_13 = metadata.isbn_13;
        }
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

    console.log(
      `  [Year ${subject.year} S${subject.semester}] ${subject.name} - ${saved} new, ${updated} updated (${books.length} matched)`
    );

    totalSaved += saved;
    totalUpdated += updated;
  }

  console.log(`Done. Total new books saved: ${totalSaved}, updated: ${totalUpdated}`);
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
