import { describe, expect, it } from 'vitest'
import { hexToRgba } from './color'

describe('hexToRgba', () => {
  it('converts a 6-digit hex color', () => {
    expect(hexToRgba('#22d3ee', 0.5)).toBe('rgba(34, 211, 238, 0.5)')
  })

  it('converts a 3-digit shorthand hex color by doubling each digit', () => {
    expect(hexToRgba('#0f0', 1)).toBe('rgba(0, 255, 0, 1)')
  })

  it('works without a leading #', () => {
    expect(hexToRgba('22d3ee', 0.5)).toBe('rgba(34, 211, 238, 0.5)')
  })

  it('passes the alpha value through unchanged', () => {
    expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)')
  })
})
