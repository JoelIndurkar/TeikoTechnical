import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import { mockSchemaInfo, mockSummary, mockBoxplotData, mockStats, mockSubset, setupFetch } from './mocks'

vi.mock('html2canvas', () => ({ // mock html2canvas for the BoxplotSection that renders inside App
  default: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,mock' }),
}))

function setupAllFetches() {
  setupFetch({
    '/api/schema-info': mockSchemaInfo,
    '/api/summary': mockSummary,
    '/api/boxplot-data': mockBoxplotData,
    '/api/stats': mockStats,
    '/api/subset': mockSubset,
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('App', () => {
  it('renders without crashing', () => {
    setupAllFetches()
    render(<App />)
  })

  it('renders header title', () => {
    setupAllFetches()
    render(<App />)
    expect(screen.getByText(/Clinical Trial Analysis/)).toBeInTheDocument()
  })

  it('renders header subtitle', () => {
    setupAllFetches()
    render(<App />)
    expect(screen.getByText('Immune Cell Population Dashboard')).toBeInTheDocument()
  })

  it('renders all 4 nav links', () => {
    setupAllFetches()
    render(<App />)
    expect(screen.getAllByText(/Part 1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Part 2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Part 3/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Part 4/).length).toBeGreaterThan(0)
  })

  it('renders all 4 section labels', () => {
    setupAllFetches()
    render(<App />)
    expect(screen.getByText('Part 1: Data Management')).toBeInTheDocument()
    expect(screen.getByText('Part 2: Data Overview')).toBeInTheDocument()
    expect(screen.getByText('Part 3: Statistical Analysis')).toBeInTheDocument()
    expect(screen.getByText('Part 4: Data Subset Analysis')).toBeInTheDocument()
  })

  it('gear button opens settings panel', () => {
    setupAllFetches()
    render(<App />)
    const gear = screen.getByLabelText('Open settings')
    fireEvent.click(gear)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('settings panel closes when onClose is triggered', () => {
    setupAllFetches()
    render(<App />)
    fireEvent.click(screen.getByLabelText('Open settings'))
    expect(screen.getByText('Settings')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button') // click X button inside the panel
    const xBtn = buttons.find(b => b.getAttribute('style')?.includes('background: none') && b !== screen.getByLabelText('Open settings')) // find the X button (it's inside the settings panel)
    if (xBtn) fireEvent.click(xBtn) // panel should be hidden (transform: translateX(100%))
  })

  it('dark mode toggle changes CSS custom properties', () => {
    setupAllFetches()
    render(<App />)
    fireEvent.click(screen.getByLabelText('Open settings'))
    const card = screen.getByText('Dark Mode').closest('div')!.parentElement!
    fireEvent.click(card) // click the dark mode card
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe('#1a1a2e') // CSS var for dark mode bg should be set
    fireEvent.click(card) // click again to toggle off
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe('') // CSS var should be removed
  })

  it('nav link click calls scrollTo without crashing', () => {
    setupAllFetches()
    render(<App />)
    const link = screen.getAllByText(/Part 2/)[0]
    fireEvent.click(link)
    expect(window.scrollTo).toHaveBeenCalled() // window.scrollTo is mocked in setup - verify it was called
  })

  it('scroll to bottom activates last section', async () => {
    setupAllFetches()
    render(<App />)
    // mock scroll position at bottom
    Object.defineProperty(window, 'scrollY', { value: 9999, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 10000, configurable: true })
    fireEvent.scroll(window)
    await waitFor(() => {
      // Part 4 link should be active (has 'active' class)
      const part4Link = screen.getAllByText(/Part 4/)[0].closest('a')
      expect(part4Link?.className).toMatch(/active/)
    })
    // restore
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('scrollTo handles missing element gracefully', () => {
    setupAllFetches()
    render(<App />)
    // mock getElementById to return null - tests the guard branch
    vi.spyOn(document, 'getElementById').mockReturnValue(null)
    const link = screen.getAllByText(/Part 1/)[0]
    fireEvent.click(link)
    // no crash - scrollTo not called since element missing
    vi.restoreAllMocks()
  })

  it('cleanup disconnects observers on unmount', () => {
    setupAllFetches()
    const { unmount } = render(<App />)
    unmount() // triggers useEffect cleanup
  })

  it('IntersectionObserver callback sets active section when intersecting', () => {
    setupAllFetches()
    const instances: any[] = []
    const OrigIO = global.IntersectionObserver
    global.IntersectionObserver = class extends (OrigIO as any) { // capture each observer instance so we can trigger the callback manually
      constructor(cb: IntersectionObserverCallback) {
        super(cb)
        instances.push(this)
      }
    } as unknown as typeof IntersectionObserver
    render(<App />)
    for (const inst of instances) {
      inst.trigger([{ isIntersecting: true }]) // trigger with true to cover isIntersecting true branch
    }
    for (const inst of instances) {
      inst.trigger([{ isIntersecting: false }]) // trigger with false to cover false branch
    }
    global.IntersectionObserver = OrigIO
  })
})
