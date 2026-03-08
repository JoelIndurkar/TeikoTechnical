import { useState, useMemo } from 'react'

interface Row {
  sample: string
  total_count: number
  population: string
  count: number
  percentage: number
}

// random dummy data - regenerated on each page load, fine for placeholder purposes
const populations = ['b_cell', 'cd4_t_cell', 'cd8_t_cell', 'nk_cell', 'monocyte']
const dummyData: Row[] = []
for (let i = 0; i < 6; i++) {
  const sampleId = `sample${String(i).padStart(5, '0')}`
  const total = 80000 + Math.floor(Math.random() * 40000)
  let remaining = total
  populations.forEach((pop, idx) => {
    const cnt = idx === populations.length - 1
      ? remaining  // last pop gets the remainder to ensure percentages add up
      : Math.floor(remaining * (0.1 + Math.random() * 0.25))
    remaining -= cnt
    dummyData.push({
      sample: sampleId,
      total_count: total,
      population: pop,
      count: cnt,
      percentage: Math.round((cnt / total) * 10000) / 100,
    })
  })
}

type SortKey = keyof Row
type SortDir = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const colHeaders: { key: SortKey; label: string }[] = [
  { key: 'sample', label: 'Sample' },
  { key: 'total_count', label: 'Total Count' },
  { key: 'population', label: 'Population' },
  { key: 'count', label: 'Count' },
  { key: 'percentage', label: 'Percentage' },
]

// distinct color/pop so you can scan the table without reading the text
const popColors: Record<string, { bg: string; text: string }> = {
  b_cell:      { bg: 'var(--data-blue-light)', text: 'var(--data-blue)' },
  cd4_t_cell:  { bg: '#e8f5e9', text: '#2e7d32' },
  cd8_t_cell:  { bg: '#fce4ec', text: '#ad1457' },
  nk_cell:     { bg: '#fff3e0', text: '#e65100' },
  monocyte:    { bg: '#f3e5f5', text: '#6a1b9a' },
}

function Shimmer({ width, height }: { width: string | number; height: number }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: 4,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--row-hover) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

interface DataTableProps {
  loading?: boolean
}

export default function DataTable({ loading = false }: DataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('sample')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)  // reset to first page when sort changes
  }

  const sorted = useMemo(() => {
    return [...dummyData].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function exportCSV() {
    const headers = ['sample', 'total_count', 'population', 'count', 'percentage']
    const rows = sorted.map(r =>
      [r.sample, r.total_count, r.population, r.count, r.percentage].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    // blob URL approach - no server needed, no library needed
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cell_counts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: '12px',
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    fontWeight: 500,
    transition: 'all var(--transition)',
    outline: 'none',
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ display: 'flex', gap: 16, padding: '10px 16px', borderBottom: '2px solid var(--border)' }}>
            {[80, 100, 90, 80, 100].map((w, i) => <Shimmer key={i} width={w} height={10} />)}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              {[80, 100, 90, 80, 120].map((w, j) => <Shimmer key={j} width={w} height={12} />)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={exportCSV}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 5,
            padding: '4px 11px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'all var(--transition)',
            outline: 'none',
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border-strong)'; b.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-secondary)' }}
        >
          Export CSV
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {colHeaders.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: sortKey === col.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottom: `2px solid ${sortKey === col.key ? 'var(--border-strong)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'color var(--transition)',
                    paddingBottom: 12,
                  }}
                >
                  {col.label}
                  <span style={{
                    marginLeft: 5,
                    opacity: sortKey === col.key ? 1 : 0,
                    fontSize: 9,
                    transition: 'opacity var(--transition)',
                  }}>
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const isHovered = hoveredRow === i
              const popColor = popColors[row.population] ?? { bg: 'var(--data-blue-light)', text: 'var(--data-blue)' }
              return (
                <tr
                  key={i}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isHovered ? 'var(--row-hover)' : 'transparent',
                    transition: 'background var(--transition)',
                    position: 'relative',
                  }}
                >
                  <td style={{
                    padding: '12px 16px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    fontSize: 12.5,
                    fontFamily: "'DM Mono', monospace",
                    boxShadow: isHovered ? 'inset 3px 0 0 var(--accent)' : 'inset 3px 0 0 transparent',
                    transition: 'box-shadow var(--transition)',
                  }}>
                    {row.sample}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12.5, fontFamily: "'DM Mono', monospace" }}>
                    {row.total_count.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: popColor.bg,
                      color: popColor.text,
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 9px',
                      borderRadius: '4px',
                      letterSpacing: '0.02em',
                    }}>
                      {row.population}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12.5, fontFamily: "'DM Mono', monospace" }}>
                    {row.count.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* .percentBar hidden below 560px */}
                      <div className="percentBar" style={{
                        flex: 1,
                        maxWidth: 80,
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${row.percentage}%`,
                          height: '100%',
                          background: 'var(--data-blue)',
                          borderRadius: 2,
                          transition: 'width var(--transition-slow)',
                          opacity: isHovered ? 1 : 0.6,
                        }} />
                      </div>
                      <span style={{
                        fontWeight: 600,
                        fontSize: 12.5,
                        color: 'var(--text-primary)',
                        fontFamily: "'DM Mono', monospace",
                        minWidth: 38,
                      }}>
                        {row.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              background: 'var(--card-bg)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            style={{
              ...btnBase,
              opacity: page === 0 ? 0.38 : 1,
              cursor: page === 0 ? 'default' : 'pointer',
            }}
          >
            ←
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            style={{
              ...btnBase,
              opacity: page >= totalPages - 1 ? 0.38 : 1,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
