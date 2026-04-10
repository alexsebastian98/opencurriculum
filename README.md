# OpenCurriculum

OpenCurriculum is a full-stack curriculum intelligence platform that maps degree subjects to practical learning resources.

At a high level:

1. Users select a major.
2. Users browse a 4-year timeline of subjects.
3. Users open a subject and see relevant books/resources.
4. Admin workflows ingest books from GitHub repositories and persist them in MongoDB Atlas.

This project is designed for real deployment, not just local demo use.

## 1) Product Scope

Supported majors:

- Computer Science
- Mathematics
- Mechanical Engineering
- Electrical Engineering
- Medicine

Core capabilities:

- Structured curriculum by year and semester
- Subject-level book lists
- Direct resource links from source repositories
- Metadata refresh workflow for author/synopsis enrichment
- GitHub extraction pipeline for bulk import
- Suggestion intake API for future resource additions

## 2) Technology Stack

Backend:

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- Axios
- NodeCache

Frontend:

- React 18
- React Router
- Vite
- Tailwind CSS
- Axios
- lucide-react

Deployment:

- Render Web Service for backend API
- Render Static Site for frontend SPA
- MongoDB Atlas for persistent data

## 3) Repository Structure

```text
backend/
  src/
    controllers/
    models/
    routes/
    services/
    utils/
    index.js
    seed.js
    adminExtract.js
frontend/
  src/
    components/
    pages/
    hooks/
    services/
render.yaml
```

## 4) Architecture and Data Flow

### Backend responsibilities

- Serve majors, subjects, books, and suggestions
- Seed majors and subjects when DB is empty
- Extract books from GitHub repos
- Match extracted books to subjects
- Persist data in Atlas
- Refresh metadata on demand

### Frontend responsibilities

- Render major and subject navigation
- Render curriculum timeline
- Render book list with hyperlinks
- Call API endpoints for data and refresh operations

### Persistent flow

1. Extraction request reaches backend API.
2. Backend fetches and parses repo content.
3. Backend assigns books to subjects.
4. Backend writes records into MongoDB Atlas.
5. Frontend reads data from API by subject.

Because Atlas is persistent storage, data survives Render restarts and redeploys.

## 5) Data Model

### Major

- name

### Subject

- name
- major_id
- year
- semester

### Book

- title
- author
- isbn_10
- isbn_13
- subject_id
- source (github or manual)
- source_url
- book_url
- synopsis
- author_summary
- metadata_source
- description_source
- metadata_confidence
- metadata_error
- metadata_refreshed_at
- metadata_version
- metadata_updated_at

Indexes:

- isbn_13
- subject_id + title

### BookSuggestion

- name (optional)
- major (required)
- book_title (required)
- book_link (required URL)
- note (optional)
- status (new, reviewed, approved, rejected)
- created_at

## 6) Runtime API Endpoints

Root and health:

- GET /
- GET /health

Majors:

- GET /api/majors
- GET /api/majors/:id

Subjects:

- GET /api/subjects/:majorId
- GET /api/subjects/detail/:subjectId

Books:

- GET /api/books/:subjectId
- POST /api/books/:bookId/refresh-metadata
- POST /api/books/refresh-metadata/subject/:subjectId
- POST /api/books/refresh-metadata/major/:majorId

GitHub extraction and reassignment:

- POST /api/github/extract-books
  - Body: repoUrl, subjectId
- POST /api/github/extract-by-major
  - Body: repoUrl, majorName
  - Returns jobId (async)
- GET /api/github/extract-jobs/:jobId
- POST /api/github/rebalance-major
  - Body: majorName (default Medicine), optional fallbackSubjectName

Suggestions:

- POST /api/suggestions
- GET /api/suggestions?limit=50

## 7) Extractor Internals

This is the core backend feature.

### Step A: Input validation

The backend validates:

- GitHub repository URL format
- Target major or subject existence

### Step B: Repository fetch

The extractor fetches markdown files from the repo. If markdown parsing yields no books, it falls back to root-level file extraction (for pdf/epub/djvu/mobi/chm style files).

### Step C: Parsing

Markdown parser supports multiple patterns:

- list entries like Title - Author
- list entries like Title by Author
- markdown links and HTML links pointing to book files
- heading-aware section context

Parser output shape includes:

- title
- author (if detectable)
- section context
- normalized book_url

### Step D: Deduplication

Books are deduplicated by normalized title to reduce duplicates across multiple files.

### Step E: Subject matching

Books are matched to subjects using token overlap and weighted scoring.

Scoring inputs include:

- subject name tokens
- title tokens
- section tokens
- partial token overlap

For medicine rebalancing:

- generic tokens like medical and medicine are de-emphasized
- fallback assignment can push unmatched books to Medical Ethics

### Step F: Persistence to Atlas

For each matched book:

1. check existing subject+title collision
2. insert if new
3. preserve source_url and book_url
4. store as source github

Result: frontend can render clickable book links directly from stored book_url.

### Step G: Async major extraction jobs

Major-level extraction runs async:

- POST extract-by-major queues job
- GET extract-jobs polls status
- Status transitions: queued, running, completed, failed

Current caveat:

- job status is in-memory and not durable across process restart
- persisted books remain safe in Atlas

## 8) Medical Rebalance Logic

Problem addressed:

- Many medicine books over-clustered in Medical Ethics

Implemented fix:

- Added rebalance endpoint for major-wide reassignment
- Improved matcher so generic medicine tokens do not dominate
- Added fallback strategy: unmatched medicine books go to Medical Ethics

Operational endpoint:

- POST /api/github/rebalance-major
- Example body: { "majorName": "Medicine" }

## 9) Environment Variables

Backend:

- MONGODB_URI
- GITHUB_TOKEN
- NODE_ENV
- CORS_ORIGINS
- PORT (optional on Render)

Frontend:

- VITE_API_URL

Local backend example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/opencurriculum
GITHUB_TOKEN=
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

Render backend example:

```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/opencurriculum?retryWrites=true&w=majority
GITHUB_TOKEN=...
NODE_ENV=production
CORS_ORIGINS=https://opencurriculum.onrender.com
```

Render frontend example:

```env
VITE_API_URL=https://opencurriculum-api-o5sh.onrender.com/api
```

## 10) Deployment Notes

Render backend service:

- type: web
- runtime: node
- rootDir: backend
- buildCommand: npm install
- startCommand: npm start

Render frontend service:

- type: static
- runtime: static
- rootDir: frontend
- buildCommand: npm install --include=dev && npm run build
- staticPublishPath: dist
- SPA rewrite to index.html

MongoDB Atlas network:

- allow Render egress CIDR ranges for your region
- ensure DB user credentials match MONGODB_URI

## 11) Scripts

Backend scripts:

- npm start
- npm run dev
- npm run seed
- npm run extract:admin
- npm run backfill:book-links
- npm run backfill:authors

Frontend scripts:

- npm run dev
- npm run build
- npm run preview

## 12) Local Development

Install:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Run backend:

```bash
cd backend
npm run dev
```

Run frontend:

```bash
cd frontend
npm run dev
```

## 13) Operations Guide

### Add new books for a major

1. Call POST /api/github/extract-by-major with repoUrl and majorName.
2. Poll GET /api/github/extract-jobs/:jobId until completed.
3. Verify books via GET /api/books/:subjectId.

### Rebalance a major

1. Call POST /api/github/rebalance-major.
2. Verify moved distribution by checking key subject endpoints.

### Refresh metadata

- run refresh by single book, subject, or major endpoints

## 14) Design Summary

Key design decisions:

- The system ingests unstructured repository content and converts it into structured curriculum resources.
- Subject assignment is heuristic and score-based with domain-specific fallback behavior.
- MongoDB Atlas is the durable source of truth, independent of application restarts.
- Async extraction jobs reduce request timeout risk on low-resource hosting tiers.
- Rebalancing workflows correct assignment quality after ingestion.

## 15) Limitations and Next Steps

Current limitations:

- extraction job status is in-memory
- matcher is heuristic, not semantic-embedding based
- metadata quality depends on external source availability

Recommended improvements:

- persist job state in MongoDB
- add auth/role checks for admin extraction endpoints
- move extraction to queue worker (Redis/BullMQ)
- add automated parser and matcher tests
- add admin UI for extraction and rebalance workflows

## 16) Security and Reliability

- Never expose backend secrets in frontend.
- Do not commit .env files.
- Rotate leaked tokens immediately.
- Keep Atlas backups/snapshots enabled.
- Keep CORS_ORIGINS restricted to trusted frontend domains.

---

OpenCurriculum is structured as a production-ready educational data pipeline that combines parsing, matching, persistence, API design, deployment operations, and post-ingestion correction workflows in one system.
