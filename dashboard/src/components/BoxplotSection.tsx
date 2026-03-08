import { useState } from 'react'

// Design choices:
// - hand-rolled SVG gives full control over layout and avoids the black-box rendering
// - p-val badge lives inside each PopChart
//   originally had them in a detached row below all charts but was visually unclear
// - grid uses auto-fit so charts reflow to mult rows on narrow screens instead of scrolling
// - fixed-col grid (like repeat(5, 1fr)) overflows at ~800px card width

interface BoxStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

function calcStats(vals: number[]): BoxStats {
  const sorted = [...vals].sort((a, b) => a - b)
  const n = sorted.length
  return {
    min: sorted[0],
    q1: sorted[Math.floor(n * 0.25)],
    median: sorted[Math.floor(n * 0.5)],
    q3: sorted[Math.floor(n * 0.75)],
    max: sorted[n - 1],
  }
}

const dummyVals: Record<string, { responder: number[]; non_responder: number[] }> = {
  b_cell: {
    responder: [8, 10, 11, 13, 9, 12, 14, 10, 11, 9, 15, 8, 12, 10, 13],
    non_responder: [6, 7, 9, 8, 10, 7, 8, 6, 9, 7, 11, 8, 7, 9, 6],
  },
  cd4_t_cell: {
    responder: [30, 34, 36, 32, 35, 38, 33, 36, 31, 37, 34, 35, 36, 32, 38],
    non_responder: [24, 27, 25, 28, 26, 23, 27, 25, 29, 24, 26, 28, 25, 27, 24],
  },
  cd8_t_cell: {
    responder: [20, 22, 25, 23, 21, 24, 22, 26, 20, 23, 25, 21, 24, 22, 25],
    non_responder: [18, 20, 19, 22, 18, 21, 19, 20, 22, 18, 21, 20, 19, 21, 18],
  },
  nk_cell: {
    responder: [14, 16, 18, 15, 17, 19, 14, 16, 18, 15, 17, 16, 14, 18, 15],
    non_responder: [10, 12, 11, 13, 10, 12, 14, 11, 13, 10, 12, 11, 13, 10, 12],
  },
  monocyte: {
    responder: [10, 12, 11, 13, 9, 11, 10, 12, 11, 10, 13, 11, 10, 12, 9],
    non_responder: [8, 9, 10, 8, 11, 9, 10, 8, 9, 11, 9, 8, 10, 9, 8],
  },
}

const dummyStats: Record<string, { pValue: number; significant: boolean }> = {
  b_cell:    { pValue: 0.0312, significant: true },
  cd4_t_cell:{ pValue: 0.0089, significant: true },
  cd8_t_cell:{ pValue: 0.2415, significant: false },
  nk_cell:   { pValue: 0.1823, significant: false },
  monocyte:  { pValue: 0.0671, significant: false },
}

const popLabels: Record<string, string> = {
  b_cell:    'B Cell',
  cd4_t_cell:'CD4 T Cell',
  cd8_t_cell:'CD8 T Cell',
  nk_cell:   'NK Cell',
  monocyte:  'Monocyte',
}

function sigAsterisks(p: number): string {
  if (p < 0.001) return '***'
  if (p < 0.01)  return '**'
  if (p < 0.05)  return '*'
  return 'ns'
}

const SVG_H = 170
const SVG_W = 130
const PAD = { top: 8, right: 6, bottom: 22, left: 26 }
const plotH = SVG_H - PAD.top - PAD.bottom
const plotW = SVG_W - PAD.left - PAD.right

// maps a data value to a y pixel coordinate
// SVG y=0 is at the top so invert: higher values = smaller y
function makeScale(domainMin: number, domainMax: number, height: number, padTop: number) {
  return (val: number) =>
    padTop + height - ((val - domainMin) / (domainMax - domainMin)) * height
}

interface SingleBoxProps {
  stats: BoxStats
  cx: number
  boxW: number
  scale: (v: number) => number
  color: string
}

function SingleBox({ stats, cx, boxW, scale, color }: SingleBoxProps) {
  const q1Y  = scale(stats.q1)
  const q3Y  = scale(stats.q3)
  const medY = scale(stats.median)
  const minY = scale(stats.min)
  const maxY = scale(stats.max)
  const half = boxW / 2
  const capW = boxW * 0.32

  return (
    <g>
      <line x1={cx} y1={q3Y} x2={cx} y2={maxY} stroke={color} strokeWidth={1.5} />
      <line x1={cx - capW} y1={maxY} x2={cx + capW} y2={maxY} stroke={color} strokeWidth={1.5} />
      <rect
        x={cx - half} y={q3Y}
        width={boxW} height={Math.max(1, q1Y - q3Y)}
        fill={color} fillOpacity={0.18}
        stroke={color} strokeWidth={1.5}
        rx={2}
      />
      <line x1={cx - half} y1={medY} x2={cx + half} y2={medY} stroke={color} strokeWidth={2.5} />
      <line x1={cx} y1={q1Y} x2={cx} y2={minY} stroke={color} strokeWidth={1.5} />
      <line x1={cx - capW} y1={minY} x2={cx + capW} y2={minY} stroke={color} strokeWidth={1.5} />
    </g>
  )
}

// click on any PopChart to open modal -> show expanded SVG + quartile table + p-value
// reuses SingleBox so the rendering is identical between the small cards and the modal
function BoxplotModal({ popKey, onClose }: { popKey: string; onClose: () => void }) {
  const rVals  = dummyVals[popKey].responder
  const nVals  = dummyVals[popKey].non_responder
  const rStats = calcStats(rVals)
  const nStats = calcStats(nVals)
  const stat   = dummyStats[popKey]
  const isSig  = stat.significant
  const asterisks = sigAsterisks(stat.pValue)

  const M_H = 300
  const M_W = 280
  const M_PAD = { top: 16, right: 16, bottom: 40, left: 44 }
  const mPlotH = M_H - M_PAD.top - M_PAD.bottom
  const mPlotW = M_W - M_PAD.left - M_PAD.right

  const allVals = [rStats.min, nStats.min, rStats.max, nStats.max]
  const domainMin = Math.floor(Math.min(...allVals) * 0.85)
  const domainMax = Math.ceil(Math.max(...allVals) * 1.15)
  const scale = makeScale(domainMin, domainMax, mPlotH, M_PAD.top)

  const tickCount = 5
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    domainMin + (i / (tickCount - 1)) * (domainMax - domainMin)
  )

  const boxW = mPlotW * 0.22
  const rCx  = M_PAD.left + mPlotW * 0.30
  const nCx  = M_PAD.left + mPlotW * 0.70

  // n row shows sample count per group
  const statRows: { label: string; r: number; n: number }[] = [
    { label: 'Min',    r: rStats.min,    n: nStats.min },
    { label: 'Q1',     r: rStats.q1,     n: nStats.q1 },
    { label: 'Median', r: rStats.median, n: nStats.median },
    { label: 'Q3',     r: rStats.q3,     n: nStats.q3 },
    { label: 'Max',    r: rStats.max,    n: nStats.max },
    { label: 'n',      r: rVals.length,  n: nVals.length },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,20,30,0.52)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
        animation: 'modalFadeIn 0.18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
          padding: '28px 32px',
          maxWidth: 620,
          width: 'calc(100vw - 48px)',
          animation: 'modalSlideIn 0.2s ease',
          position: 'relative',
        }}
      >
        {/* close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)',
            fontSize: 14, lineHeight: 1,
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--row-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
        >
          x
        </button>

        {/* header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: 4,
          }}>
            Cell Population
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {popLabels[popKey]}
          </div>
        </div>

        {/* main content: boxplot + table side by side */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* larger boxplot */}
          <div style={{ flex: '0 0 auto' }}>
            <svg width={M_W} height={M_H} viewBox={`0 0 ${M_W} ${M_H}`} style={{ display: 'block' }}>
              {ticks.map((t, i) => {
                const y = scale(t)
                return (
                  <g key={i}>
                    <line
                      x1={M_PAD.left} y1={y}
                      x2={M_PAD.left + mPlotW} y2={y}
                      stroke="var(--border)" strokeWidth={1}
                    />
                    <text x={M_PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">
                      {Math.round(t)}
                    </text>
                  </g>
                )
              })}
              <text x={rCx} y={M_H - 10} textAnchor="middle" fontSize={11} fill="var(--data-blue)" fontWeight={700}>R</text>
              <text x={nCx} y={M_H - 10} textAnchor="middle" fontSize={11} fill="var(--not-significant)" fontWeight={700}>NR</text>
              <SingleBox stats={rStats} cx={rCx} boxW={boxW} scale={scale} color="var(--data-blue)" />
              <SingleBox stats={nStats} cx={nCx} boxW={boxW} scale={scale} color="var(--not-significant)" />
            </svg>
          </div>

          {/* right panel: p-value + quartile table */}
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* prominent p-value */}
            <div style={{
              padding: '14px 18px',
              borderRadius: 8,
              background: isSig ? 'var(--significant-light)' : 'var(--bg)',
              border: `1px solid ${isSig ? 'rgba(5,150,105,0.25)' : 'var(--border)'}`,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: isSig ? '#059669' : 'var(--text-tertiary)' }}>
                Mann-Whitney U
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: isSig ? '#059669' : 'var(--text-secondary)',
                }}>
                  p = {stat.pValue < 0.001 ? stat.pValue.toExponential(1) : stat.pValue.toFixed(4)}
                </span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: isSig ? '#059669' : 'var(--text-tertiary)',
                }}>
                  {asterisks}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: isSig ? '#059669' : 'var(--text-tertiary)' }}>
                {isSig ? 'Statistically significant' : 'Not significant'}
              </div>
            </div>

            {/* quartile table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    Stat
                  </th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--data-blue)', borderBottom: '1px solid var(--border)' }}>
                    R
                  </th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--not-significant)', borderBottom: '1px solid var(--border)' }}>
                    NR
                  </th>
                </tr>
              </thead>
              <tbody>
                {statRows.map((row, i) => (
                  <tr key={row.label} style={{ borderBottom: i < statRows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontWeight: row.label === 'Median' ? 600 : 400 }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)', fontWeight: row.label === 'Median' ? 700 : 400 }}>
                      {row.r}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: "'DM Mono', monospace", color: 'var(--text-primary)', fontWeight: row.label === 'Median' ? 700 : 400 }}>
                      {row.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function PopChart({ popKey, onClick }: { popKey: string; onClick: () => void }) {
  const rStats = calcStats(dummyVals[popKey].responder)
  const nStats = calcStats(dummyVals[popKey].non_responder)
  const stat   = dummyStats[popKey]

  const allVals = [rStats.min, nStats.min, rStats.max, nStats.max]
  const domainMin = Math.floor(Math.min(...allVals) * 0.85)
  const domainMax = Math.ceil(Math.max(...allVals) * 1.15)
  const scale = makeScale(domainMin, domainMax, plotH, PAD.top)

  const tickCount = 4
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    domainMin + (i / (tickCount - 1)) * (domainMax - domainMin)
  )

  const boxW = plotW * 0.24
  const rCx = PAD.left + plotW * 0.30
  const nCx = PAD.left + plotW * 0.70

  const asterisks = sigAsterisks(stat.pValue)
  const isSig = stat.significant

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        cursor: 'pointer',
        borderRadius: 8,
        padding: '6px 4px',
        transition: 'transform 200ms ease',
        transform: 'scale(1)',
        // scale-up on hover signals clickability without needing a visible button
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}
      title={`Click to expand ${popLabels[popKey]}`}
    >
      {/* population label */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {popLabels[popKey]}
      </div>

      {/* the box plot SVG */}
      <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
        {ticks.map((t, i) => {
          const y = scale(t)
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + plotW} y2={y}
                stroke="var(--border)" strokeWidth={1}
              />
              <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={7.5} fill="var(--text-tertiary)">
                {Math.round(t)}
              </text>
            </g>
          )
        })}
        <text x={rCx} y={SVG_H - 5} textAnchor="middle" fontSize={8.5} fill="var(--data-blue)" fontWeight={600}>R</text>
        <text x={nCx} y={SVG_H - 5} textAnchor="middle" fontSize={8.5} fill="var(--not-significant)" fontWeight={600}>NR</text>
        <SingleBox stats={rStats} cx={rCx} boxW={boxW} scale={scale} color="var(--data-blue)" />
        <SingleBox stats={nStats} cx={nCx} boxW={boxW} scale={scale} color="var(--not-significant)" />
      </svg>

      {/* p-value badge directly under this chart so association is always clear */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 4,
        background: isSig ? 'var(--significant-light)' : 'var(--bg)',
        border: `1px solid ${isSig ? 'rgba(5,150,105,0.2)' : 'var(--border)'}`,
        fontSize: 11,
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10.5,
          color: isSig ? '#059669' : 'var(--text-tertiary)',
        }}>
          p = {stat.pValue < 0.001 ? stat.pValue.toExponential(1) : stat.pValue.toFixed(4)}
        </span>
        {/* asterisk notation is the standard convention in clinical publications */}
        <span style={{
          fontWeight: 700,
          fontSize: isSig ? 13 : 11,
          color: isSig ? '#059669' : 'var(--text-tertiary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          {asterisks}
        </span>
      </div>
    </div>
  )
}

interface BoxplotSectionProps {
  loading?: boolean
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

export default function BoxplotSection({ loading = false }: BoxplotSectionProps) {
  const pops = Object.keys(dummyVals)
  const [selectedPop, setSelectedPop] = useState<string | null>(null)

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
        {pops.map(pop => (
          <div key={pop} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer width="100%" height={180} />
            <Shimmer width="80%" height={24} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* card header */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Cell Population Distribution
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
          Click any chart to expand details
        </div>
      </div>

      {/* auto-fit: charts reflow to 2-3 rows on narrow screens instead of scrolling */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 20,
        marginBottom: 20,
      }}>
        {pops.map(pop => (
          <PopChart key={pop} popKey={pop} onClick={() => setSelectedPop(pop)} />
        ))}
      </div>

      {/* legend */}
      <div style={{
        display: 'flex',
        gap: 20,
        justifyContent: 'center',
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-secondary)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--data-blue)' }} />
          Responder (R)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-secondary)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--not-significant)' }} />
          Non-Responder (NR)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span style={{ fontWeight: 700, color: '#059669' }}>*</span>
          <span>p&lt;0.05</span>
          <span style={{ fontWeight: 700, color: '#059669', marginLeft: 6 }}>**</span>
          <span>p&lt;0.01</span>
          <span style={{ marginLeft: 4, color: 'var(--text-tertiary)' }}>ns = not significant</span>
        </div>
      </div>

      {/* modal */}
      {selectedPop && (
        <BoxplotModal popKey={selectedPop} onClose={() => setSelectedPop(null)} />
      )}
    </div>
  )
}
