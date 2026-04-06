import { useState } from 'react'
import { createSuggestion } from '../services/api'

export default function SuggestionForm({ majors, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    major: '',
    book_title: '',
    book_link: '',
    note: '',
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      await createSuggestion(form)
      setStatus('success')
      setMessage('Thanks. Your suggestion was submitted successfully.')
      setForm({
        name: '',
        major: '',
        book_title: '',
        book_link: '',
        note: '',
      })
      onSuccess?.()
    } catch (error) {
      setStatus('error')
      setMessage(error.response?.data?.error || error.message || 'Could not submit your suggestion.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your Name (Optional)
          </span>
          <input
            type="text"
            value={form.name}
            onChange={onChange('name')}
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Alex"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Major
          </span>
          <select
            value={form.major}
            onChange={onChange('major')}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select a major</option>
            {majors.map((major) => (
              <option key={major._id} value={major.name}>
                {major.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Suggested Book Title
        </span>
        <input
          type="text"
          value={form.book_title}
          onChange={onChange('book_title')}
          required
          maxLength={220}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Oxford Handbook of Clinical Medicine"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Book Link (Optional)
        </span>
        <input
          type="url"
          value={form.book_link}
          onChange={onChange('book_link')}
          maxLength={500}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="https://example.com/book"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Note (Optional)
        </span>
        <textarea
          value={form.note}
          onChange={onChange('note')}
          maxLength={1200}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Why this book should be included"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-semibold transition"
        >
          {status === 'loading' ? 'Submitting...' : 'Submit Suggestion'}
        </button>

        {message && (
          <p
            className={`text-sm ${
              status === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  )
}
