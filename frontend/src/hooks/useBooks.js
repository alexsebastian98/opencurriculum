import { useState, useEffect } from 'react'
import { getBooks } from '../services/api'

export function useBooks(subjectId, refreshKey = 0) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!subjectId) return
    setLoading(true)
    getBooks(subjectId)
      .then(setBooks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [subjectId, refreshKey])

  return { books, loading, error }
}
