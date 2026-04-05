import { useMajors } from '../hooks/useMajors'
import MajorCard from '../components/MajorCard'

export default function HomePage() {
  const { majors, loading, error } = useMajors()

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">
      {/* Hero */}
      <div className="mb-14 max-w-2xl">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight mb-3">
          Explore degrees.<br />Discover books.
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          A structured academic platform for bachelor-level curricula. Navigate
          courses and extract relevant books from open-source repositories.
        </p>
      </div>

      {/* Majors */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-5">
          Majors
        </h2>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-44"
              >
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full mb-1" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-500 dark:text-rose-400">
            Could not load majors: {error}
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {majors.map((major) => (
              <MajorCard key={major._id} major={major} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
