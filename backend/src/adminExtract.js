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
const { fetchRepoMarkdownFiles, normalizeRepoUrl } = require('./services/githubService');
const { extractBooksFromMarkdown } = require('./utils/markdownParser');
const { assignBooksToSubjects } = require('./utils/subjectMatcher');
const { enrichBookMetadata } = require('./services/bookMetadataService');

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
      const needsMetadata = !exists || !exists.synopsis || !exists.author_summary;
      if (needsMetadata) {
        metadata = await enrichBookMetadata({ title: book.title, author: book.author });
      }

      if (!exists) {
        await Book.create({
          title: book.title,
          author: metadata?.author || book.author || 'Unknown Author',
          subject_id: subject._id,
          source: 'github',
          source_url: normalizedRepoUrl,
          book_url: book.book_url || normalizedRepoUrl,
          synopsis: metadata?.synopsis || '',
          author_summary: metadata?.author_summary || '',
          metadata_source: metadata?.metadata_source || '',
          metadata_updated_at: metadata?.metadata_updated_at || null,
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
