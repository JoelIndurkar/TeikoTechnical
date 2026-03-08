import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SchemaOverview from '../components/SchemaOverview'
import { mockSchemaInfo, setupFetch } from './mocks'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('SchemaOverview', () => {
  it('renders without crashing', () => {
    setupFetch({ '/api/schema-info': mockSchemaInfo })
    render(<SchemaOverview />)
  })

  it('shows loading shimmer initially', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})) // use a never-resolving promise to keep loading state
    const { container } = render(<SchemaOverview />)
    const shimmers = container.querySelectorAll('[style*="shimmer"]')
    expect(shimmers.length).toBeGreaterThan(0) // shimmer divs are present (they have animation style)
  })

  it('renders 3 table names after loading', async () => {
    setupFetch({ '/api/schema-info': mockSchemaInfo })
    render(<SchemaOverview />)
    await waitFor(() => screen.getAllByText('subjects'))
    expect(screen.getAllByText('subjects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('samples').length).toBeGreaterThan(0)
    expect(screen.getAllByText('cell_counts').length).toBeGreaterThan(0)
  })

  it('displays row counts', async () => {
    setupFetch({ '/api/schema-info': mockSchemaInfo })
    render(<SchemaOverview />)
    await waitFor(() => screen.getAllByText('3,500'))
    expect(screen.getAllByText('3,500').length).toBeGreaterThan(0)   // subjects
    expect(screen.getAllByText('10,500').length).toBeGreaterThan(0)  // samples
    expect(screen.getAllByText('52,500').length).toBeGreaterThan(0)  // cell_counts
  })

  it('displays column names as chips', async () => {
    setupFetch({ '/api/schema-info': mockSchemaInfo })
    render(<SchemaOverview />)
    await waitFor(() => screen.getAllByText('subject'))
    expect(screen.getAllByText('subject').length).toBeGreaterThan(0)
    expect(screen.getAllByText('condition').length).toBeGreaterThan(0)
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    render(<SchemaOverview />)
    await waitFor(() => screen.getByText('Failed to load schema'))
    expect(screen.getByText('Failed to load schema')).toBeInTheDocument()
  })

  it('shows row hover effect', async () => {
    setupFetch({ '/api/schema-info': mockSchemaInfo })
    render(<SchemaOverview />)
    await waitFor(() => screen.getAllByText('subjects'))
    const cells = screen.getAllByText('subjects') // find the subjects table row in the schema table body
    const row = cells[cells.length - 1].closest('tr')!
    fireEvent.mouseEnter(row)
    fireEvent.mouseLeave(row)
    expect(row).toBeInTheDocument() // verify no crash
  })
})
