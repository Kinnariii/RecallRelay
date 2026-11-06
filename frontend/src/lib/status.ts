import type { Order, PlannedOrder, RefundRow } from '../api/schemas'

type Status = Order['status'] | PlannedOrder['bucket'] | RefundRow['status']
type Tone = 'confirmed' | 'uncertain' | 'unaffected' | 'failed' | 'pending'

export const status: Record<Status, { label: string; tone: Tone; icon: string }> = {
  confirmed: { label: 'Confirmed', tone: 'confirmed', icon: 'check_circle' },
  uncertain: { label: 'Uncertain', tone: 'uncertain', icon: 'warning' },
  unaffected: { label: 'Unaffected', tone: 'unaffected', icon: 'remove_circle_outline' },
  excluded: { label: 'Excluded', tone: 'unaffected', icon: 'block' },
  CREATED: { label: 'Created', tone: 'unaffected', icon: 'receipt_long' },
  AWAITING_APPROVAL: { label: 'Awaiting approval', tone: 'pending', icon: 'schedule' },
  CAPTURED: { label: 'Captured', tone: 'confirmed', icon: 'check_circle' },
  INITIATED: { label: 'Initiated', tone: 'pending', icon: 'hourglass_top' },
  PENDING: { label: 'Pending', tone: 'pending', icon: 'schedule' },
  COMPLETED: { label: 'Completed', tone: 'confirmed', icon: 'check_circle' },
  FAILED: { label: 'Failed', tone: 'failed', icon: 'error' },
  CANCELLED: { label: 'Cancelled', tone: 'unaffected', icon: 'cancel' },
}
