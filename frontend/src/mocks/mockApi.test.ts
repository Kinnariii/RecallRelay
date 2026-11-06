import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mockApi } from './mockApi'
import { samples } from './samples'

async function readyRecall() {
  const { orders } = await mockApi.reset()
  const capture = mockApi.mockCapture!(orders[0].id)
  await vi.advanceTimersByTimeAsync(350)
  await capture
  const extraction = mockApi.extract(samples[0].text)
  await vi.advanceTimersByTimeAsync(1200)
  return (await extraction).recall.id
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

it('serializes repeat approval into one refund', async () => {
  const id = await readyRecall()
  const [first, second] = await Promise.all([mockApi.approve(id), mockApi.approve(id)])
  expect(first.results[0].status).toBe('COMPLETED')
  expect(second.results[0]).toEqual({ ...first.results[0], already_existed: true })
  expect((await mockApi.refunds(id)).refunds).toEqual(first.results)
  expect((await mockApi.orders()).orders.map(order => order.refunded_cents)).toEqual([2400, 0, 0])
})

it('requires explicit retry for a failed refund and increments the attempt', async () => {
  window.history.replaceState(null, '', '/?mockfail=1')
  const id = await readyRecall()
  const failed = (await mockApi.approve(id)).results[0]
  expect(failed.status).toBe('FAILED')
  expect((await mockApi.approve(id)).results[0].attempt).toBe(1)
  const { refund } = await mockApi.retry(id, failed.order_id)
  expect(refund.status).toBe('COMPLETED')
  expect(refund.id).toBe(failed.id)
  expect(refund.paypal_request_id).toBe(`recall-${id}-order-${failed.order_id}-attempt-2`)
  expect((await mockApi.refunds(id)).refunds).toHaveLength(1)
  await expect(mockApi.retry(id, failed.order_id)).rejects.toMatchObject({ code: 'REFUND_NOT_RETRYABLE' })
})
