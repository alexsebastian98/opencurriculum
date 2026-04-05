import { useState } from 'react'
import { extractBooks } from '../services/api'

export default function GitHubExtractorForm({ subjectId, onSuccess }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    setResult(null)

    try {
      const data = await extractBooks(repoUrl.trim(), subjectId)
      setResult(data)
      setStatus('success')
      onSuccess?.()
    } catch (err) {
      setErrorMsg(err.response?.data?.error ?? err.message)
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://github.com/owner/repository"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-40 whitespace-nowrap"
        >
          {status === 'loading' ? 'Extracting…' : 'Extract Books'}
        </button>
      </div>

      {status === 'success' && result && (
        <p className="text-xs text-emerald-600">
          Found <strong>{result.total}</strong> book{result.total !== 1 ? 's' : ''} —{' '}
          <strong>{result.saved}</strong> new{' '}
          {result.saved !== 1 ? 'entries' : 'entry'} saved.
        </p>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </form>
  )
}
