import Link from 'next/link'

function range(start: number, end: number) {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

export default function Pagination({
  currentPage,
  totalPages,
  makeHref,
}: {
  currentPage: number
  totalPages: number
  makeHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  const siblingCount = 1
  const start = Math.max(1, currentPage - siblingCount)
  const end = Math.min(totalPages, currentPage + siblingCount)

  const showFirst = start > 1
  const showLast = end < totalPages

  const visiblePages = range(start, end)

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <Link
        href={makeHref(Math.max(1, currentPage - 1))}
        className="px-3 py-1 rounded-md border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : 0}
      >
        Prev
      </Link>

      {showFirst && (
        <>
          <Link
            href={makeHref(1)}
            className={`px-3 py-1 rounded-md border text-sm ${
              currentPage === 1
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            aria-current={currentPage === 1 ? 'page' : undefined}
          >
            1
          </Link>
          {start > 2 && (
            <span className="px-2 text-gray-500 select-none">…</span>
          )}
        </>
      )}

      {visiblePages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          className={`px-3 py-1 rounded-md border text-sm ${
            p === currentPage
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          aria-current={p === currentPage ? 'page' : undefined}
        >
          {p}
        </Link>
      ))}

      {showLast && (
        <>
          {end < totalPages - 1 && (
            <span className="px-2 text-gray-500 select-none">…</span>
          )}
          <Link
            href={makeHref(totalPages)}
            className={`px-3 py-1 rounded-md border text-sm ${
              currentPage === totalPages
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            aria-current={currentPage === totalPages ? 'page' : undefined}
          >
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={makeHref(Math.min(totalPages, currentPage + 1))}
        className="px-3 py-1 rounded-md border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : 0}
      >
        Next
      </Link>
    </nav>
  )
}

