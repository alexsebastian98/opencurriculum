/**
 * subjectMatcher.js
 * Keyword-based assignment of books to subjects within a major.
 * No AI: token overlap between book title/section and subject name.
 */

const STOP_WORDS = new Set([
  'to', 'the', 'a', 'an', 'of', 'and', 'in', 'for', 'with', 'on',
  'introduction', 'intro', 'advanced', 'applied', 'principles', 'fundamentals',
  'theory', 'concepts', 'modern', 'practical', 'using', 'based',
  'mathematics', 'math', 'mathematical', 'grade', 'level', 'core',
]);

const SYNONYMS = {
  algo: 'algorithm',
  algorithms: 'algorithm',
  ds: 'data',
  os: 'operating',
  ml: 'machine',
  ai: 'artificial',
  db: 'database',
  databases: 'database',
  calc: 'calculus',
  lin: 'linear',
  diff: 'differential',
  stats: 'statistics',
  prob: 'probability',
  nets: 'network',
  networking: 'network',
  crypto: 'cryptography',
  sec: 'security',
  compilers: 'compiler',
  compiler: 'compiler',
  bio: 'biology',
  chem: 'chemistry',
  phys: 'physics',
  mech: 'mechanics',
  thermo: 'thermodynamics',
  fluids: 'fluid',
  circuits: 'circuit',
  signals: 'signal',
  embed: 'embedded',
  micro: 'microprocessor',
  vlsi: 'vlsi',
  dsp: 'digital',
};

const DEFAULT_GENERIC_SUBJECT_TOKENS = new Set(['medical', 'medicine']);

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => SYNONYMS[w] || w)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function isAssignableSubject(subjectName) {
  return !/(thesis|seminar|capstone|project|rotations?)/i.test(subjectName);
}

function scoreBook(book, subjectName, options = {}) {
  const genericSubjectTokens = new Set(
    options.genericSubjectTokens || DEFAULT_GENERIC_SUBJECT_TOKENS
  );
  const subjectTokensRaw = tokenize(subjectName);
  const subjectTokens = subjectTokensRaw.filter((t) => !genericSubjectTokens.has(t));
  const effectiveSubjectTokens = subjectTokens.length > 0 ? subjectTokens : subjectTokensRaw;
  const titleTokens = new Set(tokenize(book.title));
  const sectionTokens = new Set(tokenize(book.section || ''));

  let score = 0;

  for (const st of effectiveSubjectTokens) {
    if (titleTokens.has(st)) score += 3;
    if (sectionTokens.has(st)) score += 5;

    for (const tt of titleTokens) {
      if (tt !== st && (tt.includes(st) || st.includes(tt))) score += 1;
    }
    for (const sc of sectionTokens) {
      if (sc !== st && (sc.includes(st) || st.includes(sc))) score += 2;
    }
  }

  return score;
}

function matchesSubjectPattern(subject, pattern) {
  if (!pattern) return false;
  if (pattern instanceof RegExp) return pattern.test(subject.name);
  if (typeof pattern === 'string') {
    return subject.name.toLowerCase() === pattern.toLowerCase();
  }
  return false;
}

/**
 * Assigns each book to the best-matching subject.
 * Returns Map<subjectId, { subject, books }>
 */
function assignBooksToSubjects(books, subjects, options = {}) {
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 3;
  const targetSubjects = subjects.filter((s) => isAssignableSubject(s.name));
  const fallbackSubject = targetSubjects.find((s) =>
    matchesSubjectPattern(s, options.fallbackSubjectPattern)
  );
  const map = new Map();

  for (const book of books) {
    let bestSubject = null;
    let bestScore = 0;

    for (const subject of targetSubjects) {
      const score = scoreBook(book, subject.name, options);
      if (score > bestScore) {
        bestScore = score;
        bestSubject = subject;
      }
    }

    const targetSubject =
      bestSubject && bestScore >= minScore ? bestSubject : fallbackSubject || null;

    if (targetSubject) {
      const id = targetSubject._id.toString();
      if (!map.has(id)) map.set(id, { subject: targetSubject, books: [] });
      map.get(id).books.push(book);
    }
  }

  return map;
}

module.exports = { assignBooksToSubjects };
