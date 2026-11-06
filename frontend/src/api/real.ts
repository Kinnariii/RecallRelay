import { request } from './client'
import { responses, type Api } from './schemas'

const recallPath = (id: string) => `/api/recalls/${encodeURIComponent(id)}`

export const realApi: Api = {
  health: () => request('/api/health', responses.health),
  seed: () => request('/api/admin/seed', responses.orders, 'POST'),
  reset: () => request('/api/admin/reset', responses.orders, 'POST'),
  orders: () => request('/api/orders', responses.orders),
  extract: noticeText => request('/api/recalls/extract', responses.recall, 'POST', { noticeText }),
  updateRecall: (id, edits) => request(recallPath(id), responses.recall, 'PATCH', edits),
  plan: id => request(`${recallPath(id)}/plan`, responses.plan),
  approve: id => request(`${recallPath(id)}/approve`, responses.approval, 'POST'),
  refunds: id => request(`${recallPath(id)}/refunds`, responses.refunds),
  retry: (id, orderId) => request(`${recallPath(id)}/refunds/${encodeURIComponent(orderId)}/retry`, responses.refund, 'POST'),
}
