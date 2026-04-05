import { Link } from 'react-router-dom'

const MAJOR_META = {
  'Computer Science':       { badge: 'CS', desc: 'Algorithms, systems, and software engineering.' },
  'Mathematics':            { badge: 'MA', desc: 'Analysis, algebra, and mathematical foundations.' },
  'Mechanical Engineering': { badge: 'ME', desc: 'Mechanics, thermodynamics, and design.' },
  'Electrical Engineering': { badge: 'EE', desc: 'Circuits, signals, and power systems.' },
  'Medicine':               { badge: 'MD', desc: 'Anatomy, physiology, and clinical practice.' },
}

export default function MajorCard({ major }) {
  const meta = MAJOR_META[major.name] || { badge: 'OC', desc: '' }

  return (
    <Link
      to={`/major/${major._id}`}
      className="group block bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-card hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold tracking-wide mb-4">
        {meta.badge}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{major.name}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">{meta.desc}</p>
      <div className="flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400">
        Explore Curriculum
        <svg
          className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
