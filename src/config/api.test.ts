// ─── RMASC FACTORY — API Config Tests ────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveUrl } from './api'

describe('resolveUrl', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns absolute URLs unchanged', () => {
    expect(resolveUrl('https://example.com/api/test')).toBe('https://example.com/api/test')
    expect(resolveUrl('http://localhost:4000/test')).toBe('http://localhost:4000/test')
  })

  it('prepends /api prefix to relative paths', () => {
    expect(resolveUrl('/orders')).toBe('/api/orders')
    expect(resolveUrl('orders')).toBe('/api/orders')
  })

  it('returns /api prefixed paths as-is', () => {
    expect(resolveUrl('/api/orders')).toBe('/api/orders')
    expect(resolveUrl('/api/health')).toBe('/api/health')
  })
})
