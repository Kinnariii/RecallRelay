import { samples } from '../../lib/sampleNotices'

export function SampleNoticePicker({ value, onSelect, disabled }: { value: string; onSelect: (index: string) => void; disabled?: boolean }) {
  return (
    <label className="field sample-picker">
      <span className="eyebrow">Use a sample notice</span>
      <select className="input" value={value} onChange={event => onSelect(event.target.value)} disabled={disabled}>
        <option value="">Choose a scenario</option>
        {samples.map(({ label }, index) => <option key={label} value={index}>{label}</option>)}
      </select>
    </label>
  )
}
