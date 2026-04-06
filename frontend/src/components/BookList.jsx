import { useState } from 'react'
import { refreshBookMetadata } from '../services/api'

export default function BookList({ books, loading, error }) {
  const [openBooks, setOpenBooks] = useState({})
  const [bookOverrides, setBookOverrides] = useState({})
  const [loadingDetails, setLoadingDetails] = useState({})
  const [detailsError, setDetailsError] = useState({})
  const [attemptedRefresh, setAttemptedRefresh] = useState({})

  const needsMetadata = (book) => {
    const missingAuthor = !book.author || !book.author.trim() || book.author === 'Unknown Author'
    const missingSynopsis = !book.synopsis || !book.synopsis.trim()
    return missingAuthor || missingSynopsis
  }

  const toggleBook = async (book) => {
    const bookId = book._id
    const isOpening = !openBooks[bookId]

    setOpenBooks((prev) => ({ ...prev, [bookId]: !prev[bookId] }))

    if (!isOpening) return
    if (!needsMetadata(book)) return
    if (attemptedRefresh[bookId] || loadingDetails[bookId]) return

    setLoadingDetails((prev) => ({ ...prev, [bookId]: true }))
    setDetailsError((prev) => ({ ...prev, [bookId]: '' }))

    try {
      const refreshed = await refreshBookMetadata(bookId)
      setBookOverrides((prev) => ({
        ...prev,
        [bookId]: {
          author: refreshed.author || '',
          synopsis: refreshed.synopsis || '',
          author_summary: refreshed.author_summary || '',
          metadata_source: refreshed.metadata_source || '',
        },
      }))
    } catch {
      setDetailsError((prev) => ({
        ...prev,
        [bookId]: 'Unable to refresh metadata right now.',
      }))
    } finally {
      setAttemptedRefresh((prev) => ({ ...prev, [bookId]: true }))
      setLoadingDetails((prev) => ({ ...prev, [bookId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-14 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-rose-500 dark:text-rose-400">{error}</p>
    )
  }

  if (books.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No books yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Book recommendations will appear after admin extraction.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {books.map((book) => {
        const mergedBook = { ...book, ...(bookOverrides[book._id] || {}) }

        return (
        <div key={mergedBook._id} className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {(mergedBook.book_url || mergedBook.source_url) ? (
                <a
                  href={mergedBook.book_url || mergedBook.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 transition break-words"
                >
                  {mergedBook.title}
                </a>
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{mergedBook.title}</p>
              )}
            </div>
            <span
              className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                mergedBook.source === 'github'
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              }`}
            >
              {mergedBook.source}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleBook(mergedBook)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition"
          >
            {openBooks[mergedBook._id] ? 'Hide details' : 'Show details'}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${openBooks[mergedBook._id] ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openBooks[mergedBook._id] && (
            <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3">
              {loadingDetails[mergedBook._id] && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Refreshing details...</p>
              )}

              {detailsError[mergedBook._id] && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mb-2">{detailsError[mergedBook._id]}</p>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Author:</span>{' '}
                {mergedBook.author && mergedBook.author.trim() ? mergedBook.author : 'Unknown Author'}
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Synopsis:</span>{' '}
                {mergedBook.synopsis && mergedBook.synopsis.trim()
                  ? mergedBook.synopsis
                  : 'Synopsis is not available for this book yet.'}
              </p>

            </div>
          )}
        </div>
      )})}
    </div>
  )
}
