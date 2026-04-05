import { useState, useEffect } from 'react'
import { getSubjects } from '../services/api'

export function useSubjects(majorId) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!majorId) return
    setLoading(true)
    getSubjects(majorId)
      .then(setSubjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [majorId])

  return { subjects, loading, error }
}
