import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { Plan } from '../api/schemas'
import { ConfirmApproveDialog } from '../components/domain/ConfirmApproveDialog'
import { Review } from './Review'

const plan: Plan = {
  recall_id: 'demo', blocking_problems: [], total_refund_cents: 2400,
  orders: [
    { order_id: 'order-1', customer_name: 'Asha Patel', customer_email: 'asha@example.test', total_cents: 6800, bucket: 'confirmed', refund_cents: 2400, reason: 'Lot matched.', lines: [] },
    { order_id: 'order-2', customer_name: 'Rohan Mehta', customer_email: 'rohan@example.test', total_cents: 4800, bucket: 'unaffected', refund_cents: 0, reason: 'Lot is outside the range.', lines: [] },
    { order_id: 'order-3', customer_name: 'Meera Shah', customer_email: 'meera@example.test', total_cents: 4000, bucket: 'uncertain', refund_cents: 0, reason: 'Missing lot.', lines: [] },
  ],
}
vi.mock('../api', () => ({ api: { plan: async () => ({ plan }) } }))

it('shows all three review buckets and their order badges', async () => {
  render(<MemoryRouter initialEntries={['/review/demo']}><Routes><Route path="/review/:recallId" element={<Review />} /></Routes></MemoryRouter>)
  const asha = await screen.findByRole('heading', { name: 'Asha Patel' })
  expect(within(asha.closest('section')!).getByText('Confirmed')).toBeTruthy()
  expect(within(screen.getByRole('heading', { name: 'Rohan Mehta' }).closest('section')!).getByText('Unaffected')).toBeTruthy()
  expect(within(screen.getByRole('heading', { name: 'Meera Shah' }).closest('section')!).getByText('Needs manual review')).toBeTruthy()
  expect(screen.getByText('$24.00 of $68.00')).toBeTruthy()
})

it('confirms the exact amount and requires consent', async () => {
  const onConfirm = vi.fn()
  const user = userEvent.setup()
  render(<ConfirmApproveDialog plan={plan} onClose={vi.fn()} onConfirm={onConfirm} />)
  const dialog = screen.getByRole('dialog', { name: 'Approve sandbox refunds?' })
  const approve = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Approve and refund $24.00' })
  expect(approve.disabled).toBe(true)
  await user.click(within(dialog).getByRole('checkbox'))
  expect(approve.disabled).toBe(false)
  await user.click(approve)
  expect(onConfirm).toHaveBeenCalledTimes(1)
})
