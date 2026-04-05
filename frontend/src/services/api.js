import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getMajors = () => api.get('/majors').then((r) => r.data)
export const getMajorById = (id) => api.get(`/majors/${id}`).then((r) => r.data)
export const getSubjects = (majorId) => api.get(`/subjects/${majorId}`).then((r) => r.data)
export const getSubject = (subjectId) =>
  api.get(`/subjects/detail/${subjectId}`).then((r) => r.data)
export const getBooks = (subjectId) =>
  api.get(`/books/${subjectId}`).then((r) => r.data)
export const extractBooks = (repoUrl, subjectId) =>
  api.post('/github/extract-books', { repoUrl, subjectId }).then((r) => r.data)
