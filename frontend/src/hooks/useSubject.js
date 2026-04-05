import { useState, useEffect } from 'react'
import { getSubject } from '../services/api'

export function useSubject(subjectId) {
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!subjectId) return
    setLoading(true)
    getSubject(subjectId)
      .then(setSubject)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [subjectId])

  return { subject, loading, error }
}
