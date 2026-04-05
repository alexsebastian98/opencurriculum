export default function BookList({ books, loading, error }) {
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
      {books.map((book) => (
        <div key={book._id} className="py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {(book.book_url || book.source_url) ? (
              <a
                href={book.book_url || book.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 transition break-words"
              >
                {book.title}
              </a>
            ) : (
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">{book.title}</p>
            )}
            {book.author && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">by {book.author}</p>
            )}
            {book.synopsis && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {book.synopsis}
              </p>
            )}
            {book.author_summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Author: {book.author_summary}
              </p>
            )}
          </div>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              book.source === 'github'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            }`}
          >
            {book.source}
          </span>
        </div>
      ))}
    </div>
  )
}
