import { useState, useEffect, useRef } from 'react'

// per-population chip colors - mirrors DataTable's popColors so chips are consistent everywhere
const popColors: Record<string, { bg: string; text: string }> = {
  b_cell:     { bg: 'var(--data-blue-light)', text: 'var(--data-blue)' },
  cd4_t_cell: { bg: '#e8f5e9',                text: '#2e7d32' },
  cd8_t_cell: { bg: '#fce4ec',                text: '#ad1457' },
  nk_cell:    { bg: '#fff3e0',                text: '#e65100' },
  monocyte:   { bg: '#f3e5f5',                text: '#6a1b9a' },
}

// --- PopFilter ---

interface PopFilterProps {
  populations: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function PopFilter({ populations, selected, onChange }: PopFilterProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle(pop: string) {
    onChange(selected.includes(pop) ? selected.filter(p => p !== pop) : [...selected, pop])
  }

  const noneSelected = selected.length === 0
  const allSelected  = selected.length === populations.length
  // active = at least one filter on
  const active = !noneSelected

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 30,
          padding: '0 8px 0 10px',
          minWidth: 160,
          maxWidth: 340,
          background: 'var(--card-bg)',
          border: `1px solid ${active || open ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      >
        {noneSelected ? (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flex: 1, whiteSpace: 'nowrap', textAlign: 'left' }}>
            All Populations
          </span>
        ) : (
          // show a chip per selected population in the trigger
          <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'hidden', alignItems: 'center', minWidth: 0 }}>
            {selected.map(pop => {
              const c = popColors[pop] ?? { bg: 'var(--data-blue-light)', text: 'var(--data-blue)' }
              return (
                <span key={pop} style={{
                  background: c.bg,
                  color: c.text,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  letterSpacing: '0.01em',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {pop}
                </span>
              )
            })}
          </div>
        )}
        {/* chevron - rotates when open */}
        <svg
          width="10" height="10"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          minWidth: '100%',
          width: 'max-content',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-md)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* header row: count + all/clear controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}>
              {noneSelected ? 'None' : `${selected.length} / ${populations.length}`} selected
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => onChange([...populations])}
                disabled={allSelected}
                style={{
                  background: 'none', border: 'none', fontSize: 11,
                  color: allSelected ? 'var(--text-tertiary)' : 'var(--data-blue)',
                  cursor: allSelected ? 'default' : 'pointer',
                  padding: 0, fontFamily: 'inherit',
                }}
              >
                All
              </button>
              <span style={{ color: 'var(--border-strong)', fontSize: 10 }}>|</span>
              <button
                onClick={() => onChange([])}
                disabled={noneSelected}
                style={{
                  background: 'none', border: 'none', fontSize: 11,
                  color: noneSelected ? 'var(--text-tertiary)' : 'var(--accent)',
                  cursor: noneSelected ? 'default' : 'pointer',
                  padding: 0, fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* option rows */}
          {populations.map(pop => {
            const isChecked = selected.includes(pop)
            const c = popColors[pop] ?? { bg: 'var(--data-blue-light)', text: 'var(--data-blue)' }
            return (
              <div
                key={pop}
                onClick={() => toggle(pop)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: isChecked ? 'var(--row-hover)' : 'transparent',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)' }}
                onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* custom checkbox square - coral when checked */}
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: `1.5px solid ${isChecked ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: isChecked ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 120ms ease, border-color 120ms ease',
                }}>
                  {isChecked && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* colored chip label - same style as table cells */}
                <span style={{
                  background: c.bg,
                  color: c.text,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 3,
                  letterSpacing: '0.01em',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {pop}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- SearchInput ---

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  const [focused, setFocused] = useState(false)

  // coral bottom border on focus/active - subtle signal without being heavy
  const bottomBorderColor = focused || value ? 'var(--accent)' : 'var(--border)'

  return (
    <div style={{ position: 'relative', width: 220 }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: 30,
          // right padding leaves room for the icon (or X button when there's text)
          padding: '0 28px 0 10px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderBottom: `1.5px solid ${bottomBorderColor}`,
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
        }}
      />

      {/* right side: X button when typing, search icon when empty */}
      {value ? (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 7,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : (
        <svg
          width="12" height="12"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: 'absolute',
            right: 9,
            top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--accent)' : 'var(--text-tertiary)',
            pointerEvents: 'none',
            transition: 'color 150ms ease',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )}
    </div>
  )
}
