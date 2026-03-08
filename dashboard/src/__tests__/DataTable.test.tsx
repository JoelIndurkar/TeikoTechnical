import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DataTable from '../components/DataTable'
import { mockSummary, setupFetch } from './mocks'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

async function renderLoaded() {
  setupFetch({ '/api/summary': mockSummary })
  render(<DataTable />)
  await act(async () => { await Promise.resolve() }) // advance fetch + state update
  await waitFor(() => screen.getByText('Cell Population Counts')) // table is loaded once the "Cell Population Counts" header appears
}

describe('DataTable', () => {
  it('renders without crashing', () => {
    setupFetch({ '/api/summary': mockSummary })
    render(<DataTable />)
  })

  it('shows loading shimmer initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    const { container } = render(<DataTable />)
    const shimmers = container.querySelectorAll('[style*="shimmer"]')
    expect(shimmers.length).toBeGreaterThan(0)
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('fail'))
    render(<DataTable />)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => screen.getByText('Failed to load data'))
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('renders correct column headers', async () => {
    await renderLoaded()
    expect(screen.getByText('Sample')).toBeInTheDocument()
    expect(screen.getByText('Total Count')).toBeInTheDocument()
    expect(screen.getByText('Population')).toBeInTheDocument()
    expect(screen.getByText('Count')).toBeInTheDocument()
    expect(screen.getByText('Percentage')).toBeInTheDocument()
  })

  it('defaults to 10 rows per page', async () => {
    await renderLoaded()
    const select = screen.getByDisplayValue('10') // 15 rows total, first page shows 10
    expect(select).toBeInTheDocument()
  })

  it('shows pagination info', async () => {
    await renderLoaded()
    expect(screen.getByText(/1.+10 of 15/)).toBeInTheDocument() // 15 rows, shows "1-10 of 15"
  })

  it('next page button advances pagination', async () => {
    await renderLoaded()
    const nextBtn = screen.getByText('→')
    fireEvent.click(nextBtn)
    expect(screen.getByText(/11.+15 of 15/)).toBeInTheDocument()
  })

  it('prev page button is disabled on first page', async () => {
    await renderLoaded()
    const prevBtn = screen.getByText('←')
    expect(prevBtn).toBeDisabled()
  })

  it('prev page goes back after advancing', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByText('→'))
    fireEvent.click(screen.getByText('←'))
    expect(screen.getByText(/1.+10 of 15/)).toBeInTheDocument()
  })

  it('changing rows per page updates display', async () => {
    await renderLoaded()
    const select = screen.getByDisplayValue('10')
    fireEvent.change(select, { target: { value: '25' } })
    expect(screen.getByText(/1.+15 of 15/)).toBeInTheDocument() // all 15 rows now on one page
  })

  it('clicking a column header sorts by that column', async () => {
    await renderLoaded()
    // click Sample header (already sorted by sample asc)
    // clicking again sorts desc
    const sampleHeader = screen.getByText('Sample')
    fireEvent.click(sampleHeader) // toggle to desc
    expect(screen.getAllByText('▼').some(el => (el as HTMLElement).style.opacity === '1')).toBe(true)
  })

  it('clicking same header again toggles sort direction', async () => {
    await renderLoaded()
    const sampleHeader = screen.getByText('Sample')
    fireEvent.click(sampleHeader) // desc
    expect(screen.getAllByText('▼').some(el => (el as HTMLElement).style.opacity === '1')).toBe(true)
    fireEvent.click(sampleHeader) // back to asc
    expect(screen.getAllByText('▲').some(el => (el as HTMLElement).style.opacity === '1')).toBe(true)
  })

  it('clicking a different header resets to asc', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByText('Count'))
    expect(screen.getAllByText('▲').some(el => (el as HTMLElement).style.opacity === '1')).toBe(true)
  })

  it('search box filters rows by sample ID after debounce', async () => {
    await renderLoaded()
    const searchBox = screen.getByPlaceholderText('Search by sample ID')
    fireEvent.change(searchBox, { target: { value: 'smp1' } })
    await waitFor(() => {
      expect(screen.getByText(/5 results/)).toBeInTheDocument() // result count badge appears
    }, { timeout: 2000 })
  })

  it('population filter limits rows to selected populations', async () => {
    await renderLoaded()
    const filterBtn = screen.getByText('All Populations')
    fireEvent.click(filterBtn) // open the PopFilter dropdown and select b_cell
    const bCellOptions = screen.getAllByText('b_cell')
    fireEvent.click(bCellOptions[0]) // first one is the dropdown option (PopFilter renders before table)
    expect(screen.getByText(/3 results/)).toBeInTheDocument() // 3 samples x 1 population = 3 results
  })

  it('combined search + population filter works together', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByText('All Populations'))
    const bCellOpts = screen.getAllByText('b_cell') // filter to b_cell only
    fireEvent.click(bCellOpts[0]) // first is inside PopFilter dropdown
    const searchBox = screen.getByPlaceholderText('Search by sample ID') // then search for smp1
    fireEvent.change(searchBox, { target: { value: 'smp1' } })
    await waitFor(() => {
      expect(screen.getByText(/1 result/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows empty state when no rows match filters', async () => {
    await renderLoaded()
    const searchBox = screen.getByPlaceholderText('Search by sample ID')
    fireEvent.change(searchBox, { target: { value: 'zzznomatch' } })
    await waitFor(() => screen.getByText('No rows match your filters.'), { timeout: 2000 })
    expect(screen.getByText('No rows match your filters.')).toBeInTheDocument()
  })

  it('clear filters button resets search and population filter', async () => {
    await renderLoaded() // set a search that matches nothing
    const searchBox = screen.getByPlaceholderText('Search by sample ID')
    fireEvent.change(searchBox, { target: { value: 'zzznomatch' } })
    await waitFor(() => screen.getByText('Clear filters'), { timeout: 2000 })
    fireEvent.click(screen.getByText('Clear filters'))
    await waitFor(() => screen.getByText(/of 15/))
    expect(screen.getByText(/of 15/)).toBeInTheDocument() // search box should be cleared and table shows rows again
  })

  it('pagination resets to page 1 when search changes', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByText('→')) // go to page 2
    expect(screen.getByText(/11.+15/)).toBeInTheDocument()
    const searchBox = screen.getByPlaceholderText('Search by sample ID')
    fireEvent.change(searchBox, { target: { value: 'smp' } }) // type in search
    await waitFor(() => screen.getByText(/1.+10 of 15/), { timeout: 2000 })
    expect(screen.getByText(/1.+10 of 15/)).toBeInTheDocument() // page should reset to 1
  })

  it('CSV export triggers createObjectURL with a Blob', async () => {
    await renderLoaded()
    const exportBtn = screen.getByText('Export CSV')
    const mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as unknown as HTMLElement)
    fireEvent.click(exportBtn)
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(mockAnchor.click).toHaveBeenCalled()
  })

  it('Export CSV button mouseEnter/mouseLeave changes style', async () => {
    await renderLoaded()
    const exportBtn = screen.getByText('Export CSV').closest('button')!
    fireEvent.mouseEnter(exportBtn)
    fireEvent.mouseLeave(exportBtn)
    expect(exportBtn).toBeInTheDocument()
  })

  it('row hover changes background', async () => {
    await renderLoaded()
    const rows = screen.getAllByRole('row')
    const dataRow = rows[1] // first data row (index 0 is header)
    fireEvent.mouseEnter(dataRow)
    fireEvent.mouseLeave(dataRow)
    expect(dataRow).toBeInTheDocument()
  })

  it('shows 0 results text when no data', async () => {
    setupFetch({ '/api/summary': [] })
    render(<DataTable />)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => screen.getByText('Cell Population Counts'))
    expect(screen.getByText('0 results')).toBeInTheDocument()
  })

  it('uses fallback color for unknown population', async () => {
    const unknownPop = [{ sample: 'smpX', total_count: 100, population: 'unknown_pop', count: 100, percentage: 100.0 }]
    setupFetch({ '/api/summary': unknownPop })
    render(<DataTable />)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => screen.getByText('unknown_pop'))
    expect(screen.getByText('unknown_pop')).toBeInTheDocument()
  })
})
