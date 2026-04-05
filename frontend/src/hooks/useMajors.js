import { useState, useEffect } from 'react'
import { getMajors } from '../services/api'

export function useMajors() {
  const [majors, setMajors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMajors()
      .then(setMajors)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { majors, loading, error }
}
