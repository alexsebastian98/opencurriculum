import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSuggestions } from '../services/api'
import { useMajors } from '../hooks/useMajors'
import SuggestionForm from '../components/SuggestionForm'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function ForumPage() {
  const { majors } = useMajors()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const formRef = useRef(null)

  const loadSuggestions = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSuggestions(100)
      setSuggestions(data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not load suggestions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuggestions()
  }, [])

  const rows = useMemo(() => suggestions, [suggestions])

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8">
        <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200">Forum</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Suggest Books</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed">
          This is a public suggestion board. No login is required. Submit books you want uploaded, and your post
          appears in the feed below.
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 transition"
        >
          Suggest a Book
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Public Suggestions</h2>

        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading suggestions...</p>}

        {!loading && error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No suggestions posted yet.</p>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((item) => (
              <article
                key={item._id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.book_title}</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.created_at)}</span>
                </div>

                <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">Major: {item.major}</p>

                {item.book_link && (
                  <a
                    href={item.book_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 break-all"
                  >
                    {item.book_link}
                  </a>
                )}

                {item.note && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">{item.note}</p>
                )}

                {item.name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Posted by {item.name}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section ref={formRef} className="scroll-mt-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Post Your Suggestion</h2>
        <SuggestionForm majors={majors} onSuccess={loadSuggestions} />
      </section>
    </div>
  )
}
