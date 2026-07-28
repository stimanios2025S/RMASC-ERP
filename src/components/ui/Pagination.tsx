// ─── RMASC FACTORY — Universal Pagination Component ─────────────────────
// Pure CSS, no dependencies. Works with the backend pagination metadata.

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface Props {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export default function Pagination({ meta, onPageChange }: Props) {
  if (meta.totalPages <= 1) return null

  const pages: (number | string)[] = []
  const delta = 2
  for (let i = 1; i <= meta.totalPages; i++) {
    if (i === 1 || i === meta.totalPages || (i >= meta.page - delta && i <= meta.page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
      <span className="text-[11px] text-white/50">
        Page {meta.page} sur {meta.totalPages} — {meta.total} résultat{meta.total > 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={!meta.hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Préc.
        </button>
        {pages.map((p, i) =>
          typeof p === 'number' ? (
            <button
              key={i}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                p === meta.page
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={i} className="px-1 text-white/30 text-xs">...</span>
          )
        )}
        <button
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Suiv. →
        </button>
      </div>
    </div>
  )
}
