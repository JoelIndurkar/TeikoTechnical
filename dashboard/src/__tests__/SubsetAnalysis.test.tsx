import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SubsetAnalysis from '../components/SubsetAnalysis'
import { mockSubset, setupFetch } from './mocks'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('SubsetAnalysis', () => {
  it('renders without crashing', () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
  })

  it('shows loading shimmer initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    const { container } = render(<SubsetAnalysis />)
    const shimmers = container.querySelectorAll('[style*="shimmer"]')
    expect(shimmers.length).toBeGreaterThan(0)
  })

  it('renders stat card labels after loading', async () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('Responders'))
    expect(screen.getByText('Responders')).toBeInTheDocument()
    expect(screen.getByText('Non-Responders')).toBeInTheDocument()
    expect(screen.getByText('Male')).toBeInTheDocument()
    expect(screen.getByText('Female')).toBeInTheDocument()
    expect(screen.getByText('Avg B Cells')).toBeInTheDocument()
  })

  it('renders samples per project section', async () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('Samples per Project'))
    expect(screen.getByText('prj1')).toBeInTheDocument()
    expect(screen.getByText('prj2')).toBeInTheDocument()
  })

  it('displays avg_b_cells formatted to 2 decimal places', async () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
    // 10401.28 formatted as 10,401.28
    await waitFor(() => screen.getByText('10,401.28'))
    expect(screen.getByText('10,401.28')).toBeInTheDocument()
  })

  it('displays responder and non-responder counts', async () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('38'))
    expect(screen.getByText('38')).toBeInTheDocument()  // responder_count
    expect(screen.getByText('39')).toBeInTheDocument()  // non_responder_count
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('Failed to load subset data'))
    expect(screen.getByText('Failed to load subset data')).toBeInTheDocument()
  })

  it('avg B cells card has accent styling', async () => {
    setupFetch({ '/api/subset': mockSubset })
    const { container } = render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('10,401.28'))
    const cards = container.querySelectorAll('[style*="gradient"]') // accent card has a gradient background style
    expect(cards.length).toBeGreaterThan(0)
  })

  it('stat cards respond to hover', async () => {
    setupFetch({ '/api/subset': mockSubset })
    render(<SubsetAnalysis />)
    await waitFor(() => screen.getByText('Responders'))
    const card = screen.getByText('Responders').closest('div')!
    const { fireEvent } = await import('@testing-library/react')
    // hover triggers style changes
    fireEvent.mouseEnter(card)
    fireEvent.mouseLeave(card)
    expect(card).toBeInTheDocument() // verify no crash
  })
})
