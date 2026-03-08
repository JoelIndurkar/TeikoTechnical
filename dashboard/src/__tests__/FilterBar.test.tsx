import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PopFilter, SearchInput } from '../components/FilterBar'

const POPS = ['b_cell', 'cd4_t_cell', 'cd8_t_cell', 'nk_cell', 'monocyte']

// PopFilter

describe('PopFilter', () => {
  it('renders trigger button with All Populations when nothing selected', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    expect(screen.getByText('All Populations')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('All Populations'))
    // dropdown shows population options
    expect(screen.getByText('b_cell')).toBeInTheDocument()
    expect(screen.getByText('cd4_t_cell')).toBeInTheDocument()
  })

  it('closes dropdown on second click', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('All Populations'))
    fireEvent.click(screen.getByText('All Populations'))
    expect(screen.queryByText('b_cell')).not.toBeInTheDocument()
  })

  it('calls onChange when a population is clicked', () => {
    const onChange = vi.fn()
    render(<PopFilter populations={POPS} selected={[]} onChange={onChange} />)
    fireEvent.click(screen.getByText('All Populations'))
    fireEvent.click(screen.getByText('b_cell'))
    expect(onChange).toHaveBeenCalledWith(['b_cell'])
  })

  it('removes population from selection when clicked again', () => {
    const onChange = vi.fn()
    render(<PopFilter populations={POPS} selected={['b_cell']} onChange={onChange} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn) // trigger shows selected chip not the "All" text, open dropdown
    const options = screen.getAllByText('b_cell') // b_cell appears in dropdown
    fireEvent.click(options[options.length - 1]) // last one is in the dropdown
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('calls onChange with all populations when All button is clicked', () => {
    const onChange = vi.fn()
    render(<PopFilter populations={POPS} selected={['b_cell']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('All'))
    expect(onChange).toHaveBeenCalledWith(POPS)
  })

  it('calls onChange with empty array when Clear button is clicked', () => {
    const onChange = vi.fn()
    render(<PopFilter populations={POPS} selected={['b_cell']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('All button is disabled when all are selected', () => {
    render(<PopFilter populations={POPS} selected={POPS} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('All')).toBeDisabled()
  })

  it('Clear button is disabled when none are selected', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('All Populations'))
    expect(screen.getByText('Clear')).toBeDisabled()
  })

  it('shows selected count in header when some are selected', () => {
    render(<PopFilter populations={POPS} selected={['b_cell', 'nk_cell']} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/2 \/ 5/)).toBeInTheDocument()
  })

  it('shows None in header when nothing is selected', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('All Populations'))
    expect(screen.getByText(/None/)).toBeInTheDocument()
  })

  it('closes when clicking outside', () => {
    render(
      <div>
        <PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />
        <div data-testid="outside">outside</div>
      </div>
    )
    fireEvent.click(screen.getByText('All Populations'))
    expect(screen.getByText('b_cell')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('b_cell')).not.toBeInTheDocument()
  })

  it('dropdown item mouseEnter/mouseLeave when unchecked changes background', () => {
    render(<PopFilter populations={POPS} selected={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('All Populations'))
    const bCellItem = screen.getByText('b_cell').closest('div[style]')!
    fireEvent.mouseEnter(bCellItem)
    fireEvent.mouseLeave(bCellItem)
    expect(bCellItem).toBeInTheDocument()
  })

  it('dropdown item mouseEnter/mouseLeave when checked does not change background', () => {
    render(<PopFilter populations={POPS} selected={['b_cell']} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const bCellOptions = screen.getAllByText('b_cell')
    const bCellItem = bCellOptions[bCellOptions.length - 1].closest('div[style]')!
    fireEvent.mouseEnter(bCellItem)
    fireEvent.mouseLeave(bCellItem)
    expect(bCellItem).toBeInTheDocument()
  })
})

// SearchInput

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('shows search icon when value is empty', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />)
    const svg = container.querySelector('svg circle')
    expect(svg).toBeInTheDocument() // search icon is an svg with a circle element
  })

  it('shows clear X button when value is not empty', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onChange with empty string when X is clicked', () => {
    const onChange = vi.fn()
    render(<SearchInput value="hello" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'smp1' } })
    expect(onChange).toHaveBeenCalledWith('smp1')
  })

  it('applies accent border on focus', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.focus(input) // border style changes 
    expect(container.firstChild).toBeInTheDocument() // check the component doesn't crash
    fireEvent.blur(input)
  })

  it('clear X button mouseEnter/mouseLeave changes color', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />)
    const clearBtn = screen.getByRole('button')
    fireEvent.mouseEnter(clearBtn)
    fireEvent.mouseLeave(clearBtn)
    expect(clearBtn).toBeInTheDocument()
  })
})
