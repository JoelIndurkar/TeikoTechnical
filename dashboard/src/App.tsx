import { useEffect, useState } from 'react'
import './App.css'
import SchemaOverview from './components/SchemaOverview'
import DataTable from './components/DataTable'
import BoxplotSection from './components/BoxplotSection'
import SubsetAnalysis from './components/SubsetAnalysis'

const navLinks = [
  { id: 'section-schema', prefix: 'Part 1', suffix: ': Data Management' },
  { id: 'section-overview', prefix: 'Part 2', suffix: ': Data Overview' },
  { id: 'section-analysis', prefix: 'Part 3', suffix: ': Statistical Analysis' },
  { id: 'section-subset', prefix: 'Part 4', suffix: ': Data Subset Analysis' },
] // prefix/suffix split to hide suffix on small screens

export default function App() {
  const [activeSection, setActiveSection] = useState('section-schema')

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
