import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import MajorPage from './pages/MajorPage'
import SubjectPage from './pages/SubjectPage'
import ForumPage from './pages/ForumPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-200">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/major/:majorId" element={<MajorPage />} />
          <Route path="/subject/:subjectId" element={<SubjectPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
