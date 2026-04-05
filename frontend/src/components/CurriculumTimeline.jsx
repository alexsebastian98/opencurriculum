import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SubjectAccordion from './SubjectAccordion'

export default function CurriculumTimeline({ subjects, majorId, majorName }) {
  const years = useMemo(
    () => [...new Set(subjects.map((s) => s.year))].sort((a, b) => a - b),
    [subjects]
  )

  const [activeYear, setActiveYear] = useState(years[0] ?? 1)

  const grouped = useMemo(() => {
    const g = {}
    for (const s of subjects) {
      if (!g[s.year]) g[s.year] = {}
      if (!g[s.year][s.semester]) g[s.year][s.semester] = []
      g[s.year][s.semester].push(s)
    }
    return g
  }, [subjects])

  return (
    <div>
      {/* Year tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeYear === year
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Year {year}
          </button>
        ))}
      </div>

      {/* Semester columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((semester) => (
          <SubjectAccordion key={semester} title={`Semester ${semester}`} defaultOpen>
            <div className="space-y-0.5">
              {(grouped[activeYear]?.[semester] ?? []).length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No subjects</p>
              ) : (
                (grouped[activeYear]?.[semester] ?? []).map((subject) => (
                  <Link
                    key={subject._id}
                    to={`/subject/${subject._id}`}
                    state={{ subjectName: subject.name, majorName, majorId }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800 group transition"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                      {subject.name}
                    </span>
                    <svg
                      className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))
              )}
            </div>
          </SubjectAccordion>
        ))}
      </div>
    </div>
  )
}
