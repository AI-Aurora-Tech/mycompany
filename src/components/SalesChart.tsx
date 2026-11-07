import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dayMonth, int, money, moneyCompact } from '../lib/format'

interface Point { start: Date; total: number; count: number }

export function SalesChart({ buckets, bucketDays }: { buckets: Point[]; bucketDays: number }) {
  const data = buckets.map((b) => {
    const end = new Date(b.start.getTime() + (bucketDays - 1) * 86_400_000)
    return {
      label: bucketDays === 30 ? b.start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : dayMonth(b.start),
      range: bucketDays === 1 ? b.start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : `${dayMonth(b.start)} a ${dayMonth(end)}`,
      total: Math.round(b.total * 100) / 100,
      count: b.count,
    }
  })
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap={data.length > 20 ? 2 : '20%'}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={{ fill: 'var(--text-3)', fontSize: 12 }} minTickGap={16} />
          <YAxis tickFormatter={moneyCompact} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-3)', fontSize: 12 }} width={72} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <div className="chart-tip">
                  <div className="t">{p.range}</div>
                  <div className="v">{money(p.total)}</div>
                  <div className="subtle">{int(p.count)} {p.count === 1 ? 'venda' : 'vendas'}</div>
                </div>
              )
            }}
          />
          <Bar dataKey="total" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
