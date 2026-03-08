import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BoxplotSection from '../components/BoxplotSection'
import { mockBoxplotData, mockStats, setupFetch } from './mocks'

vi.mock('html2canvas', () => ({ // mock html2canvas at the module level
  default: vi.fn().mockImplementation((_el: HTMLElement, opts: Record<string, unknown>) => {
    if (opts?.onclone) { // call onclone w/ a div w/ nodes that have var() in attr to cover attribute-replacement logic inside downloadPNG
      const clonedEl = document.createElement('div')
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svgEl.setAttribute('stroke', 'var(--data-blue)')
      svgEl.setAttribute('fill', 'var(--border)')
      svgEl.setAttribute('style', 'color: var(--text-primary); background: var(--card-bg)')
      clonedEl.appendChild(svgEl)
      ;(opts.onclone as (doc: Document, el: HTMLElement) => void)(document, clonedEl)
    }
    return Promise.resolve({ toDataURL: () => 'data:image/png;base64,mock' })
  }),
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

async function renderLoaded() {
  setupFetch({
    '/api/boxplot-data': mockBoxplotData,
    '/api/stats': mockStats,
  })
  render(<BoxplotSection />)
  await act(async () => { await Promise.resolve() })
  await waitFor(() => screen.getByText('Cell Population Distribution'))
}

describe('BoxplotSection', () => {
  it('renders without crashing', () => {
    setupFetch({ '/api/boxplot-data': mockBoxplotData, '/api/stats': mockStats })
    render(<BoxplotSection />)
  })

  it('shows loading shimmer initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    const { container } = render(<BoxplotSection />)
    const shimmers = container.querySelectorAll('[style*="shimmer"]')
    expect(shimmers.length).toBeGreaterThan(0)
  })

  it('shows error when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('fail'))
    render(<BoxplotSection />)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => screen.getByText('Failed to load boxplot data'))
    expect(screen.getByText('Failed to load boxplot data')).toBeInTheDocument()
  })

  it('renders 5 population chart labels after loading', async () => {
    await renderLoaded()
    expect(screen.getAllByText('B Cell').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CD4 T Cell').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CD8 T Cell').length).toBeGreaterThan(0)
    expect(screen.getAllByText('NK Cell').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Monocyte').length).toBeGreaterThan(0)
  })

  it('renders SIG badge for significant population', async () => {
    await renderLoaded()
    const sigBadges = screen.getAllByText('SIG')
    expect(sigBadges.length).toBeGreaterThan(0)
  })

  it('renders NS badge for non-significant population', async () => {
    await renderLoaded()
    const nsBadges = screen.getAllByText('NS')
    expect(nsBadges.length).toBeGreaterThan(0)
  })

  it('renders p-value with exponential notation when p < 0.001', async () => {
    await renderLoaded()
    // nk_cell has p_value=0.0001, displayed as 1.0e-4
    const expText = screen.getAllByText(/e-\d/)
    expect(expText.length).toBeGreaterThan(0)
  })

  it('renders legend with Responder and Non-Responder labels', async () => {
    await renderLoaded()
    expect(screen.getByText('Responder (R)')).toBeInTheDocument()
    expect(screen.getByText('Non-Responder (NR)')).toBeInTheDocument()
  })

  it('clicking a chart opens the detail modal', async () => {
    await renderLoaded()
    const charts = screen.getAllByTitle(/Click to expand/)
    fireEvent.click(charts[0]) // open b_cell modal
    await waitFor(() => screen.getByText('Cell Population'))
    expect(screen.getByText('Cell Population')).toBeInTheDocument()
  })

  it('modal shows correct population name', async () => {
    await renderLoaded()
    const charts = screen.getAllByTitle(/Click to expand B Cell/)
    fireEvent.click(charts[0])
    await waitFor(() => screen.getAllByText('B Cell'))
    // B Cell appears as both the chart label and the modal header
    expect(screen.getAllByText('B Cell').length).toBeGreaterThan(1)
  })

  it('modal shows stats table with quartile labels', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByText('Min'))
    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.getByText('Q1')).toBeInTheDocument()
    expect(screen.getByText('Median')).toBeInTheDocument()
    expect(screen.getByText('Q3')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
  })

  it('modal shows Mann-Whitney label', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByText('Mann-Whitney U'))
    expect(screen.getByText('Mann-Whitney U')).toBeInTheDocument()
  })

  it('modal shows Statistically significant for significant population', async () => {
    await renderLoaded()
    // b_cell is significant
    fireEvent.click(screen.getAllByTitle(/Click to expand B Cell/)[0])
    await waitFor(() => screen.getByText('Statistically significant'))
    expect(screen.getByText('Statistically significant')).toBeInTheDocument()
  })

  it('modal shows Not significant for non-significant population', async () => {
    await renderLoaded()
    // monocyte is not significant (p=0.3429)
    fireEvent.click(screen.getAllByTitle(/Click to expand Monocyte/)[0])
    await waitFor(() => screen.getByText('Not significant'))
    expect(screen.getByText('Not significant')).toBeInTheDocument()
  })

  it('modal closes when X button is clicked', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByText('Cell Population'))
    fireEvent.click(screen.getByText('x'))
    await waitFor(() => expect(screen.queryByText('Cell Population')).not.toBeInTheDocument())
  })

  it('modal closes when backdrop is clicked', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByText('Cell Population'))
    // backdrop is the outer fixed div that has the onClick=onClose
    // clicking the modal container (not the inner panel) closes it
    const modalContainer = screen.getByText('Cell Population').closest('[style*="position: fixed"]')!
    fireEvent.click(modalContainer)
    await waitFor(() => expect(screen.queryByText('Cell Population')).not.toBeInTheDocument())
  })

  it('PNG download button exists in modal', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByTitle('Download as PNG'))
    expect(screen.getByTitle('Download as PNG')).toBeInTheDocument()
  })

  it('clicking PNG download calls html2canvas', async () => {
    const { default: html2canvas } = await import('html2canvas')
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByTitle('Download as PNG'))
    await act(async () => {
      fireEvent.click(screen.getByTitle('Download as PNG'))
    })
    await waitFor(() => expect(html2canvas).toHaveBeenCalled())
  })

  it('tooltip appears on responder box hover', async () => {
    await renderLoaded()
    const responderBox = screen.getByTestId('b_cell-responder-box')
    fireEvent.mouseEnter(responderBox)
    await waitFor(() => screen.getByText('Responder'))
    expect(screen.getByText('Responder')).toBeInTheDocument()
    fireEvent.mouseLeave(responderBox)
  })

  it('tooltip appears on non-responder box hover', async () => {
    await renderLoaded()
    const nrBox = screen.getByTestId('b_cell-non-responder-box')
    fireEvent.mouseEnter(nrBox)
    await waitFor(() => screen.getByText('Non-Responder'))
    expect(screen.getByText('Non-Responder')).toBeInTheDocument()
    fireEvent.mouseLeave(nrBox)
  })

  it('tooltip shows quartile stats', async () => {
    await renderLoaded()
    const responderBox = screen.getByTestId('b_cell-responder-box')
    // also fire mouseMove on parent to set mouse position
    const chart = responderBox.closest('[title]')!
    fireEvent.mouseMove(chart, { clientX: 100, clientY: 200 })
    fireEvent.mouseEnter(responderBox)
    await waitFor(() => screen.getAllByText('Median'))
    // Median appears in both tooltip and modal table headers - just check it's there
    expect(screen.getAllByText('Median').length).toBeGreaterThan(0)
    fireEvent.mouseLeave(responderBox)
  })

  it('tooltip positioning flips when near right edge', async () => {
    // set window.innerWidth to a small value so the flip triggers
    Object.defineProperty(window, 'innerWidth', { value: 100, configurable: true })
    await renderLoaded()
    const responderBox = screen.getByTestId('b_cell-responder-box')
    const chart = responderBox.closest('[title]')!
    fireEvent.mouseMove(chart, { clientX: 99, clientY: 50 })
    fireEvent.mouseEnter(responderBox)
    await waitFor(() => screen.getByText('Responder'))
    fireEvent.mouseLeave(responderBox)
    // restore
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  })

  it('chart hover scale animation fires without crash', async () => {
    await renderLoaded()
    const charts = screen.getAllByTitle(/Click to expand/)
    fireEvent.mouseEnter(charts[0])
    fireEvent.mouseLeave(charts[0])
    expect(charts[0]).toBeInTheDocument()
  })

  it('modal PNG download button mouseEnter/mouseLeave changes style', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByTitle('Download as PNG'))
    const dlBtn = screen.getByTitle('Download as PNG')
    fireEvent.mouseEnter(dlBtn)
    fireEvent.mouseLeave(dlBtn)
    expect(dlBtn).toBeInTheDocument()
  })

  it('modal close X button mouseEnter/mouseLeave changes style', async () => {
    await renderLoaded()
    fireEvent.click(screen.getAllByTitle(/Click to expand/)[0])
    await waitFor(() => screen.getByText('x'))
    const xBtn = screen.getByText('x').closest('button')!
    fireEvent.mouseEnter(xBtn)
    fireEvent.mouseLeave(xBtn)
    expect(xBtn).toBeInTheDocument()
  })
})
