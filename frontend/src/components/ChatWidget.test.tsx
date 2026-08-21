import { render, screen, fireEvent, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatWidget from './ChatWidget'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('../lib/session', () => ({
  getSessionId: () => 'test-session-id',
}))

const mockedApi = vi.mocked(api)

function startResponse(
  messages: Array<{ id: number; sender: 'visitor' | 'ai' | 'admin'; text: string }>,
  aiPending = false,
) {
  return {
    conversationId: 1,
    mode: 'ai' as const,
    aiPending,
    messages: messages.map((m) => ({ ...m, createdAt: '2026-01-01T00:00:00.000Z' })),
  }
}

// Flushes any pending microtasks (promise .then chains) without needing real time to pass —
// fake timers intercept setTimeout, so the usual testing-library `findBy`/`waitFor` polling
// would never fire; advancing by 0ms still runs the microtask queue between ticks.
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function openChat() {
  fireEvent.click(screen.getByLabelText('Abrir chat'))
  await flush()
}

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockedApi.get.mockReset()
    mockedApi.post.mockReset()
    // jsdom não implementa scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows only the launcher until opened, with no network call', () => {
    render(<ChatWidget />)

    expect(screen.getByLabelText('Abrir chat')).toBeInTheDocument()
    expect(mockedApi.post).not.toHaveBeenCalled()
  })

  it('starts the conversation and renders the seeded history on open', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([{ id: 1, sender: 'ai', text: 'Oi! Como posso ajudar?' }]))

    render(<ChatWidget />)
    await openChat()

    expect(mockedApi.post).toHaveBeenCalledWith('/chat/start', { sessionId: 'test-session-id' })
    expect(screen.getByText('Oi! Como posso ajudar?')).toBeInTheDocument()
  })

  it('shows the typing bubble immediately after sending, before the response resolves', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([]))
    let resolveSend: (value: unknown) => void = () => {}
    mockedApi.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve
        }),
    )

    render(<ChatWidget />)
    await openChat()

    const input = screen.getByPlaceholderText('Digite sua mensagem...')
    fireEvent.change(input, { target: { value: 'Quero um site' } })
    fireEvent.click(screen.getByLabelText('Enviar mensagem'))
    await flush()

    expect(mockedApi.post).toHaveBeenLastCalledWith('/chat/test-session-id/messages', { text: 'Quero um site' })
    // Otimista: a mensagem em si só entra na lista quando o servidor responde (abaixo), mas a bolha
    // de "digitando" (três pontos pulsantes) já aparece antes disso.
    expect(document.querySelectorAll('[style*="pulse-glow"]').length).toBeGreaterThan(0)

    await act(async () => {
      resolveSend({ id: 2, sender: 'visitor', text: 'Quero um site', createdAt: '2026-01-01T00:00:00.000Z', aiPending: true })
      await vi.advanceTimersByTimeAsync(0)
    })
  })

  it('merges polled messages without duplicating ones already rendered', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([{ id: 1, sender: 'ai', text: 'Oi!' }]))
    mockedApi.get.mockResolvedValue({
      aiPending: false,
      messages: [
        { id: 1, sender: 'ai', text: 'Oi!', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 2, sender: 'ai', text: 'Segunda mensagem', createdAt: '2026-01-01T00:00:01.000Z' },
      ],
    })

    render(<ChatWidget />)
    await openChat()
    expect(screen.getByText('Oi!')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(screen.getByText('Segunda mensagem')).toBeInTheDocument()
    expect(screen.getAllByText('Oi!')).toHaveLength(1)
  })

  it('polls faster while an AI reply is pending', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([], true))
    mockedApi.get.mockResolvedValue({ aiPending: true, messages: [] })

    render(<ChatWidget />)
    await openChat()
    mockedApi.get.mockClear()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('keeps polling while minimized', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([]))
    mockedApi.get.mockResolvedValue({ aiPending: false, messages: [] })

    render(<ChatWidget />)
    await openChat()
    fireEvent.click(screen.getByLabelText('Minimizar chat'))
    await flush()
    mockedApi.get.mockClear()

    expect(screen.getByLabelText('Reabrir chat')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(mockedApi.get).toHaveBeenCalled()
  })

  it('clears the poll interval on unmount', async () => {
    mockedApi.post.mockResolvedValueOnce(startResponse([]))
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = render(<ChatWidget />)
    await openChat()

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
