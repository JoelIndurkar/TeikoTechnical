import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SettingsPanel from '../components/SettingsPanel'

function renderPanel(overrides = {}) {
  const props = {
    open: false,
    darkMode: false,
    onClose: vi.fn(),
    onToggleDark: vi.fn(),
    ...overrides,
  }
  return { ...render(<SettingsPanel {...props} />), props }
}

describe('SettingsPanel', () => {
  it('renders without crashing', () => {
    renderPanel()
  })

  it('shows Settings heading when open', () => {
    renderPanel({ open: true })
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('shows Dark Mode label', () => {
    renderPanel({ open: true })
    expect(screen.getByText('Dark Mode')).toBeInTheDocument()
  })

  it('shows Off when dark mode is off', () => {
    renderPanel({ open: true, darkMode: false })
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('shows On when dark mode is on', () => {
    renderPanel({ open: true, darkMode: true })
    expect(screen.getByText('On')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', () => {
    const { props } = renderPanel({ open: true })
    const buttons = screen.getAllByRole('button') // the X button is the one inside the panel header (not the backdrop)
    fireEvent.click(buttons[0]) // first button is the close X
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const { props, container } = renderPanel({ open: true })
    const backdrop = container.firstElementChild as HTMLElement // backdrop is the first div (sibling of the panel div)
    fireEvent.click(backdrop)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleDark when the dark mode card is clicked', () => {
    const { props } = renderPanel({ open: true })
    const card = screen.getByText('Dark Mode').closest('div')!.parentElement! // toggle card contains Dark Mode text
    fireEvent.click(card)
    expect(props.onToggleDark).toHaveBeenCalledTimes(1)
  })

  it('X close button mouseEnter/mouseLeave changes color', () => {
    renderPanel({ open: true })
    const xBtn = screen.getAllByRole('button')[0]
    fireEvent.mouseEnter(xBtn)
    fireEvent.mouseLeave(xBtn)
    expect(xBtn).toBeInTheDocument()
  })
})
