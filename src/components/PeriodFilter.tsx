import { PRESET_LABEL, periodFromPreset, type Period, type PeriodPreset } from '../lib/period'

const PRESETS: PeriodPreset[] = ['hoje', '7d', '30d', 'mes', '90d', 'tudo', 'custom']

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="btn-row">
      <div className="segmented" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button key={p} className={value.preset === p ? 'on' : ''} onClick={() => onChange(periodFromPreset(p, value))}>
            {PRESET_LABEL[p]}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="btn-row">
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            value={value.from}
            max={value.to}
            onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
            aria-label="Data inicial"
          />
          <span className="muted">até</span>
          <input
            type="date"
            className="input"
            style={{ width: 'auto' }}
            value={value.to}
            min={value.from}
            onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
            aria-label="Data final"
          />
        </div>
      )}
    </div>
  )
}
