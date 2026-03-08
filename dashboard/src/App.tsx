import { useEffect, useState } from 'react'
import './App.css'
import SchemaOverview from './components/SchemaOverview'
import DataTable from './components/DataTable'
import BoxplotSection from './components/BoxplotSection'
import SubsetAnalysis from './components/SubsetAnalysis'
import SettingsPanel from './components/SettingsPanel'

const navLinks = [
  { id: 'section-schema', prefix: 'Part 1', suffix: ': Data Management' },
  { id: 'section-overview', prefix: 'Part 2', suffix: ': Data Overview' },
  { id: 'section-analysis', prefix: 'Part 3', suffix: ': Statistical Analysis' },
  { id: 'section-subset', prefix: 'Part 4', suffix: ': Data Subset Analysis' },
] // prefix/suffix split to hide suffix on small screens

export default function App() {
  const [activeSection, setActiveSection] = useState('section-schema')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // apply dark mode by overriding CSS vars on root element
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.style.setProperty('--bg', '#1a1a2e')
      root.style.setProperty('--card-bg', '#252542')
      root.style.setProperty('--text-primary', '#f0f0f0')
      root.style.setProperty('--text-secondary', '#a0a0b0')
      root.style.setProperty('--text-tertiary', '#6a6a80')
      root.style.setProperty('--border', '#3a3a5c')
      root.style.setProperty('--border-strong', '#4a4a6e')
      root.style.setProperty('--row-hover', '#2e2e4a')
      root.style.setProperty('--data-blue', '#5ba3b8')
      root.style.setProperty('--data-blue-light', 'rgba(91, 163, 184, 0.12)')
      root.style.setProperty('--header-bg', 'rgba(26, 26, 46, 0.92)')
      root.style.setProperty('--subnav-bg', 'rgba(26, 26, 46, 0.95)')
    } else {
      ;[
        '--bg', '--card-bg', '--text-primary', '--text-secondary', '--text-tertiary',
        '--border', '--border-strong', '--row-hover', '--data-blue', '--data-blue-light',
        '--header-bg', '--subnav-bg',
      ].forEach(v => root.style.removeProperty(v))
    }
  }, [darkMode])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    navLinks.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      // rootMargin leaves trigger band in the middle to avoid false activations when sections overlap in viewport
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: '-40% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    // edge case: short sections (Part 4)
    // fallback: if user scrolled to within 40px of the bottom, activate the last section
    function onScroll() {
      const scrollBottom = window.scrollY + window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (scrollBottom >= docHeight - 40) {
        setActiveSection(navLinks[navLinks.length - 1].id)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observers.forEach(o => o.disconnect())
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    // can't use scrollIntoView({block:'start'}) because it doesn't know about the sticky header+subnav
    // measure both elements at call time (heights can change on resize) and subtract them
    const headerEl = document.querySelector('.header') as HTMLElement | null
    const subnavEl = document.querySelector('.subnav') as HTMLElement | null
    const offset = (headerEl?.offsetHeight ?? 60) + (subnavEl?.offsetHeight ?? 40) + 12
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <>
      <div className="topAccent" />

      <header className="header">
        <div className="headerInner">
          <span className="headerTitle">Teiko<span className="headerTitleDot" />Clinical Trial Analysis</span>
          <span className="headerSubtitle">Immune Cell Population Dashboard</span>
          <button
            className="gearBtn"
            onClick={() => setSettingsOpen(o => !o)}
            aria-label="Open settings"
            style={{ marginLeft: 'auto' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <nav className="subnav">
        <div className="subnavInner">
          {navLinks.map(link => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={`subnavLink${activeSection === link.id ? ' active' : ''}`}
              onClick={e => { e.preventDefault(); scrollTo(link.id) }}
            >
              {link.prefix}<span className="navSuffix">{link.suffix}</span>
            </a>
          ))}
        </div>
      </nav>

      <SettingsPanel
        open={settingsOpen}
        darkMode={darkMode}
        onClose={() => setSettingsOpen(false)}
        onToggleDark={() => setDarkMode(d => !d)}
      />

      <main className="pageContent">
        <section id="section-schema">
          <div className="sectionLabel">Part 1: Data Management</div>
          <SchemaOverview />
        </section>

        <section id="section-overview">
          <div className="sectionLabel">Part 2: Data Overview</div>
          <div className="card">
            <DataTable />
          </div>
        </section>

        <section id="section-analysis">
          <div className="sectionLabel">Part 3: Statistical Analysis</div>
          <div className="card">
            <BoxplotSection />
          </div>
        </section>

        <section id="section-subset">
          <div className="sectionLabel">Part 4: Data Subset Analysis</div>
          <SubsetAnalysis />
        </section>
      </main>
    </>
  )
}
