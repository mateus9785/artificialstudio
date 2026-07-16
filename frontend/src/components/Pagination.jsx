export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  function goTo(p) {
    if (p < 1 || p > totalPages || p === page) return
    onPageChange(p)
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2 mt-12">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
      >
        ‹
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => goTo(p)}
          aria-current={p === page ? 'page' : undefined}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer"
          style={
            p === page
              ? { background: 'linear-gradient(135deg, #0891b2, #7c3aed)', color: 'white' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }
          }
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page === totalPages}
        aria-label="Próxima página"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}
      >
        ›
      </button>
    </nav>
  )
}
