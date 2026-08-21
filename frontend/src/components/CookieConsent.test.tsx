import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CookieConsent from './CookieConsent'
import { getStoredConsent } from '../lib/analytics'

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts everything via "Aceitar todos"', async () => {
    const onDecision = vi.fn()
    const user = userEvent.setup()
    render(<CookieConsent onDecision={onDecision} />)

    await user.click(screen.getByRole('button', { name: 'Aceitar todos' }))

    expect(onDecision).toHaveBeenCalledWith({ analytics: true, marketing: true })
    expect(getStoredConsent()).toEqual({ analytics: true, marketing: true })
  })

  it('declines everything via "Rejeitar opcionais"', async () => {
    const onDecision = vi.fn()
    const user = userEvent.setup()
    render(<CookieConsent onDecision={onDecision} />)

    await user.click(screen.getByRole('button', { name: 'Rejeitar opcionais' }))

    expect(onDecision).toHaveBeenCalledWith({ analytics: false, marketing: false })
    expect(getStoredConsent()).toEqual({ analytics: false, marketing: false })
  })

  it('declines everything via the close button too', async () => {
    const onDecision = vi.fn()
    const user = userEvent.setup()
    render(<CookieConsent onDecision={onDecision} />)

    await user.click(screen.getByLabelText('Fechar (equivale a rejeitar opcionais)'))

    expect(onDecision).toHaveBeenCalledWith({ analytics: false, marketing: false })
  })

  it('sends only the toggled categories when saving custom preferences', async () => {
    const onDecision = vi.fn()
    const user = userEvent.setup()
    render(<CookieConsent onDecision={onDecision} />)

    await user.click(screen.getByRole('button', { name: 'Personalizar' }))

    const [, analyticsToggle, marketingToggle] = screen.getAllByRole('checkbox')
    await user.click(marketingToggle) // both start checked — uncheck marketing only

    await user.click(screen.getByRole('button', { name: 'Salvar preferências' }))

    expect(analyticsToggle).toBeChecked()
    expect(onDecision).toHaveBeenCalledWith({ analytics: true, marketing: false })
  })
})
