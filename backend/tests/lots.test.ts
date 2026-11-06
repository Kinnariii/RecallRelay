import { expect, it } from 'vitest'
import { lotInRecall, parseLot } from '../src/logic/lots.js'

const range = { lot_prefix: 'B-', lot_start: 200, lot_end: 250, extra_lots: [] }

it('parses the prefix and a safe integer', () => {
  expect(parseLot('B-214')).toEqual({ prefix: 'B-', number: 214 })
  expect(parseLot('B-99999999999999999999')).toBeNull()
})

it.each([
  ['B-200', 'affected'], ['B-250', 'affected'], ['B-199', 'unaffected'], ['B-251', 'unaffected'],
  [null, 'uncertain'], ['', 'uncertain'], ['garbage', 'uncertain'], ['A-214', 'uncertain'],
])('classifies %s as %s', (lot, expected) => expect(lotInRecall(lot, range)).toBe(expected))

it('matches exact listed lots and keeps unfamiliar formats uncertain', () => {
  const list = { lot_prefix: null, lot_start: null, lot_end: null, extra_lots: ['B-104', 'special lot'] }
  expect(lotInRecall('B-104', list)).toBe('affected')
  expect(lotInRecall('B-105', list)).toBe('unaffected')
  expect(lotInRecall('A-104', list)).toBe('uncertain')
  expect(lotInRecall('special lot', list)).toBe('affected')
})
