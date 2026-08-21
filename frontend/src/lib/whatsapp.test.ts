import { describe, expect, it } from 'vitest'
import { WHATSAPP_NUMBER, waLink } from './whatsapp'

describe('waLink', () => {
  it('returns the bare wa.me link when no text is given', () => {
    expect(waLink()).toBe(`https://wa.me/${WHATSAPP_NUMBER}`)
  })

  it('returns the bare wa.me link for null/empty text', () => {
    expect(waLink(null)).toBe(`https://wa.me/${WHATSAPP_NUMBER}`)
    expect(waLink('')).toBe(`https://wa.me/${WHATSAPP_NUMBER}`)
  })

  it('appends a URL-encoded text param when text is given', () => {
    expect(waLink('Olá, quero um orçamento!')).toBe(
      `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20quero%20um%20or%C3%A7amento!`,
    )
  })
})
