import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a button for every page and marks the current one', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '3' })).not.toHaveAttribute('aria-current')
  })

  it('disables the previous button on the first page and the next button on the last page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByLabelText('Página anterior')).toBeDisabled()
    expect(screen.getByLabelText('Próxima página')).not.toBeDisabled()
  })

  it('calls onPageChange with the clicked page number', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('does not call onPageChange when clicking the already-active page', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('advances to the next page via the next button', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByLabelText('Próxima página'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
