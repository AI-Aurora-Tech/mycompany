import type { ReactNode } from 'react'

export interface BarItem {
  key: string
  label: ReactNode
  value: number
  display: ReactNode
  secondary?: ReactNode
}

/** Ranking em barras horizontais finas, ordenado do maior para o menor. */
export function BarList({ items, ranked = true, empty = 'Sem dados no período.' }: { items: BarItem[]; ranked?: boolean; empty?: string }) {
  if (items.length === 0) return <div className="empty">{empty}</div>
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="bar-list">
      {items.map((it, i) => (
        <div key={it.key} className="bar-row" style={ranked ? undefined : { gridTemplateColumns: 'minmax(0,1fr) auto' }}>
          {ranked && <span className={`rank-pos ${i < 3 ? `p${i + 1}` : ''}`}>{i + 1}</span>}
          <div>
            <div className="label">
              <span>{it.label}</span>
              {it.secondary && <span className="subtle num">{it.secondary}</span>}
            </div>
            <div className="bar-track" title={`${it.value}`}>
              <div className="bar-fill" style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
          </div>
          <span className="bar-value">{it.display}</span>
        </div>
      ))}
    </div>
  )
}
