/**
 * backfillDirectLinks.js
 *
 * Re-parses each unique GitHub repo stored in the DB and force-updates book_url
 * to the direct file link (PDF/EPUB/etc.) wherever the markdown contains one.
 *
 * Run once after initial data extraction:
 *   node backend/src/backfillDirectLinks.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Book = require('./models/Book');
const { fetchRepoMarkdownFiles, normalizeRepoUrl } = require('./services/githubService');
const { extractBooksFromMarkdown } = require('./utils/markdownParser');

const FILE_LINK_RE = /\.(pdf|epub|djvu|mobi)(\?.*)?$/i;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function run() {
  await connectDB();

  // Gather all unique source_url values from github-sourced books
  const repoUrls = await Book.distinct('source_url', { source: 'github', source_url: { $ne: '' } });
  console.log(`Found ${repoUrls.length} unique repo(s) to scan.`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const rawRepoUrl of repoUrls) {
    let repoUrl;
    try {
      repoUrl = normalizeRepoUrl(rawRepoUrl);
    } catch {
      console.warn(`  [skip] Invalid repo URL: ${rawRepoUrl}`);
      continue;
    }

    console.log(`\nProcessing: ${repoUrl}`);

    let files;
    try {
      files = await fetchRepoMarkdownFiles(repoUrl);
    } catch (err) {
      console.warn(`  [error] Could not fetch files: ${err.message}`);
      continue;
    }

    // Parse every markdown file and collect books with direct file links
    const directLinks = new Map(); // normalized-title → book_url

    for (const file of files) {
      const books = extractBooksFromMarkdown(file.content, {
        repoUrl,
        filePath: file.path,
      });

      for (const book of books) {
        if (!book.book_url || !FILE_LINK_RE.test(book.book_url)) continue;
        const key = book.title.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!directLinks.has(key)) {
          directLinks.set(key, book.book_url);
        }
      }
    }

    console.log(`  Direct file links found: ${directLinks.size}`);

    // Match against DB books for this repo and update
    for (const [normalizedTitle, bookUrl] of directLinks) {
      const result = await Book.updateOne(
        {
          source: 'github',
          source_url: rawRepoUrl,
          title: { $regex: new RegExp(`^${escapeRegex(normalizedTitle)}$`, 'i') },
        },
        { $set: { book_url: bookUrl } }
      );

      if (result.modifiedCount > 0) {
        totalUpdated += 1;
      } else {
        totalSkipped += 1;
      }
    }
  }

  console.log(`\nBackfill complete.`);
  console.log(`  Updated : ${totalUpdated}`);
  console.log(`  No match: ${totalSkipped}`);

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
