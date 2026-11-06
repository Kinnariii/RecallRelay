import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { Plan, RefundRow } from '../api/schemas'
import { ToastProvider } from '../components/ui/ToastProvider'
import { Result } from './Result'

const plan: Plan = { recall_id: 'recall-test', total_refund_cents: 2400, blocking_problems: [], orders: [] }
const row: RefundRow = {
  id: 'refund-test', recall_id: 'recall-test', order_id: 'order-test', amount_cents: 2400, attempt: 1,
  paypal_request_id: 'recall-recall-test-order-order-test-attempt-1', paypal_refund_id: '7XK12345AB678901C',
  status: 'COMPLETED', error: null, already_existed: false,
  created_at: '2026-11-07T02:00:00Z', updated_at: '2026-11-07T02:00:02Z',
}
const approve = vi.fn(async (_id: string) => ({ results: [{ ...row, already_existed: true }], plan }))
vi.mock('../api', () => ({ api: { plan: async () => ({ plan }), refunds: async () => ({ refunds: [row] }), approve: (id: string) => approve(id) } }))

it('shows the refund ID and completed status from the API', async () => {
  render(<MemoryRouter initialEntries={['/result/recall-test']}><Routes><Route path="/result/:recallId" element={<Result />} /></Routes></MemoryRouter>)
  const table = await screen.findByRole('table', { name: 'Refund details' })
  expect(within(table).getByText('7XK12345AB678901C')).toBeTruthy()
  expect(within(table).getByText('Completed')).toBeTruthy()
  expect(screen.getByRole('heading', { name: '$24.00 refunded' })).toBeTruthy()
})

it('calls repeat approval and shows the no-duplicate toast', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/result/recall-test']}><ToastProvider>
    <Routes><Route path="/result/:recallId" element={<Result />} /></Routes>
  </ToastProvider></MemoryRouter>)
  await user.click(await screen.findByRole('button', { name: 'Approve again' }))
  expect(await screen.findByText('Already refunded. No duplicate created.')).toBeTruthy()
  expect(approve).toHaveBeenCalledWith('recall-test')
})
