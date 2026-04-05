import { useParams, Link } from 'react-router-dom'
import { useSubjects } from '../hooks/useSubjects'
import { useMajors } from '../hooks/useMajors'
import CurriculumTimeline from '../components/CurriculumTimeline'

export default function MajorPage() {
  const { majorId } = useParams()
  const { subjects, loading, error } = useSubjects(majorId)
  const { majors } = useMajors()

  const major = majors.find((m) => m._id === majorId)

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8">
        <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition">
          Home
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200">{major?.name ?? 'Major'}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {major?.name ?? '…'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">4-year bachelor curriculum</p>
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-40 bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-500 dark:text-rose-400">Could not load subjects: {error}</p>
      )}

      {!loading && !error && subjects.length > 0 && (
        <CurriculumTimeline
          subjects={subjects}
          majorId={majorId}
          majorName={major?.name}
        />
      )}
    </div>
  )
}
