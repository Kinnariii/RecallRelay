import { expect, it } from 'vitest'
import { formatCents } from './money'

it.each([[2400, '$24.00'], [5, '$0.05'], [0, '$0.00'], [1234567, '$12,345.67']])('formats %i cents as %s', (cents, expected) => {
  expect(formatCents(cents)).toBe(expected)
})
