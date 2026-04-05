import { useParams, useLocation, Link } from 'react-router-dom'
import { useSubject } from '../hooks/useSubject'
import { useBooks } from '../hooks/useBooks'
import BookList from '../components/BookList'

export default function SubjectPage() {
  const { subjectId } = useParams()
  const location = useLocation()
  const { subject } = useSubject(subjectId)

  // Prefer navigation state for instant display, fall back to fetched subject
  const subjectName = location.state?.subjectName ?? subject?.name
  const majorName   = location.state?.majorName   ?? subject?.major_id?.name
  const majorId     = location.state?.majorId     ?? subject?.major_id?._id

  const { books, loading: booksLoading, error: booksError } = useBooks(subjectId)

  return (
    <div className="max-w-3xl mx-auto px-6 pt-24 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8 flex-wrap">
        <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition">
          Home
        </Link>
        <span>/</span>
        {majorId ? (
          <>
            <Link
              to={`/major/${majorId}`}
              state={location.state}
              className="hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              {majorName ?? 'Major'}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="text-slate-700 dark:text-slate-200">{subjectName ?? 'Subject'}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {subjectName ?? '…'}
        </h1>
      </div>

      {/* Book list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Books</h2>
          {books.length > 0 && (
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
              {books.length}
            </span>
          )}
        </div>
        <BookList books={books} loading={booksLoading} error={booksError} />
      </div>

      {/* Legal disclaimer */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-10 leading-relaxed max-w-md mx-auto">
        All book listings are extracted from public repositories and are for
        educational reference only.
      </p>
    </div>
  )
}
