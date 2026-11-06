import range from '../../../data/sample-notices/notice-01.txt?raw'
import list from '../../../data/sample-notices/notice-02.txt?raw'
import unknownSku from '../../../data/sample-notices/notice-03.txt?raw'
import unusualLot from '../../../data/sample-notices/notice-04.txt?raw'
import incomplete from '../../../data/sample-notices/notice-05.txt?raw'

export const samples = [
  { label: 'Notice 1 · Lot range (B-200 to B-250)', text: range.trimEnd() },
  { label: 'Notice 2 · Lot list (B-101, B-104, B-112)', text: list.trimEnd() },
  { label: 'Notice 3 · Different SKU (PB-500)', text: unknownSku.trimEnd() },
  { label: 'Notice 4 · Ambiguous lot format', text: unusualLot.trimEnd() },
  { label: 'Notice 5 · Ambiguous date and incomplete range', text: incomplete.trimEnd() },
]
