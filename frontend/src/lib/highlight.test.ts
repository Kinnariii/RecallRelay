import { expect, it } from 'vitest'
import { splitEvidence } from './highlight'

it('preserves the notice and links verified quotes across whitespace', () => {
  const notice = 'Affected lots: B-200\n through B-250.'
  const segments = splitEvidence(notice, [{ field: 'lot_range', quote: 'b-200 through B-250', verified: true }])
  expect(segments.map(segment => segment.text)).toEqual(['Affected lots: ', 'B-200\n through B-250', '.'])
  expect(segments[1].marks).toEqual([{ index: 0, verified: true }])
})

it('does not treat unverified quotes as verified or mark text that is absent', () => {
  const segments = splitEvidence('B-200', [
    { field: 'lot_range', quote: 'B-200', verified: false },
    { field: 'lot_end', quote: 'B-250', verified: false },
  ])
  expect(segments).toEqual([{ text: 'B-200', marks: [{ index: 0, verified: false }] }])
})
