import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  highlight?: boolean
}

export function Kpi({ label, value, hint, icon, highlight }: Props) {
  return (
    <div className={`card kpi ${highlight ? 'highlight' : ''}`}>
      <div className="kpi-label">
        {icon}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  )
}
