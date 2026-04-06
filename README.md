# OpenCurriculum

OpenCurriculum is a full-stack curriculum explorer for degree programs. It organizes majors into a 4-year timeline, lets users drill into subjects, and shows recommended books with direct links and enriched metadata.

This repository contains:
- A Node.js + Express + MongoDB backend API
- A React + Vite + Tailwind frontend

## What The App Does

1. Shows majors (Computer Science, Mathematics, Mechanical Engineering, Electrical Engineering, Medicine).
2. Shows subject timelines by year and semester for each major.
3. Shows books for each subject.
4. Links users directly to the specific book file when available (for example direct PDF links), not just repo home pages.
5. Enriches books with metadata (author, synopsis, ISBN fields, source confidence).
6. Supports admin ingestion from GitHub repositories and metadata refresh workflows.

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Axios
- NodeCache

### Frontend
- React 18
- React Router
- Vite
- Tailwind CSS
- Axios
- lucide-react

## Repository Structure

```text
backend/
  src/
    controllers/
    models/
    routes/
    services/
    utils/
    adminExtract.js
    backfillBookLinks.js
    backfillDirectLinks.js
    seed.js
    index.js
frontend/
  src/
    components/
    hooks/
    pages/
    services/
```

## Architecture Overview

### Backend Responsibilities
- Serve majors, subjects, and books via REST APIs.
- Seed majors/subjects automatically when DB is empty.
- Extract books from GitHub repositories (admin CLI flow).
- Normalize and store direct file links.
- Enrich metadata using ISBN/title-based lookups.

### Frontend Responsibilities
- Render major cards and curriculum timeline.
- Render subject-level book list.
- Render per-book details via expandable dropdown UI.
- Trigger per-book metadata refresh on demand when details are missing.

## Data Model

### Major
- `name`

### Subject
- `name`
- `major_id`
- `year`
- `semester`

### Book
- `title`
- `author`
- `isbn_10`
- `isbn_13`
- `subject_id`
- `source` (`github` or `manual`)
- `source_url` (origin repo)
- `book_url` (direct file URL when available)
- `synopsis`
- `author_summary`
- `metadata_source` (for example `openlibrary-isbn`, `openlibrary`, `google-books`, `wikipedia`, `generated`)
- `description_source` (`isbn`, `title-author`, etc.)
- `metadata_confidence` (0-100)
- `metadata_error`
- `metadata_refreshed_at`
- `metadata_version`
- `metadata_updated_at`

Indexes:
- `isbn_13`
- `{ subject_id, title }`

## Metadata Enrichment Pipeline

Book enrichment is ISBN-first with fallbacks:

1. Open Library ISBN endpoint (`openlibrary-isbn`) when ISBN exists.
2. Open Library title/author search (`openlibrary`) with title normalization and multi-query attempts.
3. Google Books title/author fallback (`google-books`).
4. Wikipedia summary fallback (`wikipedia`).
5. Generated fallback (`generated`) when external sources fail.

Additional behavior:
- ISBN normalization and validation (ISBN-10/ISBN-13).
- ISBN-10 to ISBN-13 conversion when possible.
- In-memory metadata caching (24 hours) to reduce repeated API calls.

## GitHub Extraction Pipeline

Admin extraction (`adminExtract.js`) performs:

1. Fetch markdown files from repository root.
2. Parse book entries from markdown patterns and direct file links.
3. If no markdown books are found, fallback to root-level file extraction (`pdf`, `epub`, `djvu`, `mobi`, `chm`) using filenames as titles.
4. Deduplicate titles.
5. Match books to subjects in the selected major.
6. Save new books and enrich metadata.

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local or remote)

## Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/opencurriculum
PORT=5000
GITHUB_TOKEN=your_github_token_optional
```

Notes:
- `GITHUB_TOKEN` is strongly recommended to avoid low unauthenticated rate limits.
- Rotate tokens immediately if accidentally exposed.

## Installation

### 1. Backend

```bash
cd backend
npm install
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Running The App

### Start backend

```bash
cd backend
npm run dev
```

Backend starts on `http://localhost:5000` by default.

### Start frontend

```bash
cd frontend
npm run dev
```

Frontend runs on Vite dev server and proxies API calls via relative `/api` paths.

## Database Seeding

Seed is automatic when backend starts and no majors exist.

Manual seed command:

```bash
cd backend
npm run seed
```

## API Endpoints

### Majors
- `GET /api/majors`
- `GET /api/majors/:id`

### Subjects
- `GET /api/subjects/:majorId`
- `GET /api/subjects/detail/:subjectId`

### Books
- `GET /api/books/:subjectId`
- `POST /api/books/:bookId/refresh-metadata`
- `POST /api/books/refresh-metadata/subject/:subjectId`
- `POST /api/books/refresh-metadata/major/:majorId`

### GitHub extraction endpoint
A GitHub extraction controller exists (`routes/github.js`, `controllers/githubController.js`) for:
- `POST /api/github/extract-books`

If you want this HTTP endpoint active, ensure it is mounted in `backend/src/index.js`.

## Backend Scripts

From `backend/package.json`:

- `npm run start` -> start API
- `npm run dev` -> start API with nodemon
- `npm run seed` -> seed majors/subjects
- `npm run extract:admin` -> run admin extraction CLI
- `npm run backfill:book-links` -> old backfill (repo URL fallback)
- `npm run backfill:authors` -> author backfill script

Additional script in repo:
- `node src/backfillDirectLinks.js` -> force-update `book_url` to direct file URLs when available

## Admin Extraction Usage

```bash
cd backend
node src/adminExtract.js --repo "https://github.com/owner/repo" --major "Major Name"
```

Example:

```bash
node src/adminExtract.js --repo "https://github.com/manjunath5496/Mathematics-Books" --major "Mathematics"
```

## Frontend Routes

- `/` -> majors homepage
- `/major/:majorId` -> timeline for selected major
- `/subject/:subjectId` -> subject detail and books

## UI Notes

- Major cards use minimalist icons by major.
- Book rows are expandable; details show author and synopsis.
- On expanding a book with missing metadata, frontend can trigger metadata refresh and render updated details.

## Operational Workflows

### Add books for a major from GitHub
1. Run admin extraction with repo URL + major.
2. Optionally run direct link backfill.
3. Refresh metadata by major/subject as needed.

### Restrict a major to approved repositories
Use MongoDB cleanup scripts to delete books for that major where `source_url` is not in your allow-list.

### Verify source distribution
Query grouped counts by `source_url` for all books under a major's subjects.

## Troubleshooting

### No books extracted from a repo
- Cause: README has no parseable markdown list.
- Current behavior: extraction falls back to root-level book files when available.

### Books show Unknown Author or generic synopsis
- Run metadata refresh endpoints (single/subject/major).
- Some titles have no strong external metadata match; fallback content may remain.

### GitHub rate limits
- Configure `GITHUB_TOKEN` in `backend/.env`.

### Route mismatch for `/api/github/extract-books`
- If endpoint returns 404, mount `github` router in `backend/src/index.js`.

## Security Notes

- Never commit `.env` to version control.
- Rotate any leaked tokens immediately.
- Respect copyright and licensing of external content repositories.

## Future Improvements

- Add scheduler/queue for periodic metadata refresh.
- Add admin UI for repo ingestion and source allow-list management.
- Improve subject matching confidence and manual reassignment tools.
- Add automated tests for parser patterns and metadata service fallbacks.
