import '@testing-library/jest-dom'

class MockIntersectionObserver { // jsdom doesn't implement IntersectionObserver - must be a class for vitest
  private cb: IntersectionObserverCallback
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: number[] = []
  constructor(cb: IntersectionObserverCallback) { this.cb = cb }
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.cb(entries as IntersectionObserverEntry[], this) // expose so tests can trigger entries if needed
  }
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

window.scrollTo = vi.fn() // jsdom doesn't implement scrollTo

// mock URL blob methods used by CSV and PNG export
Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true })
Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true })

// suppress act() warnings from "renders without crashing" tests that don't await async state
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})

// suppress jsdom "Not implemented: navigation to another Document" written directly to stderr
const originalStderrWrite = process.stderr.write.bind(process.stderr)
process.stderr.write = (chunk: string | Uint8Array, ...args: any[]) => {
  if (typeof chunk === 'string' && chunk.includes('Not implemented')) return true
  return originalStderrWrite(chunk, ...args)
}
