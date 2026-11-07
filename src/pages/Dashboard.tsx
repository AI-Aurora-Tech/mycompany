import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, DollarSign, Package, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { useDB } from '../data/store'
import { CHANNEL_LABEL, PAYMENT_LABEL, type SaleChannel } from '../data/types'
import { byChannel, byPayment, financeInPeriod, salesInPeriod, sellerRanking, stockValue, summary, timeSeries, topProducts } from '../lib/analytics'
import { int, money } from '../lib/format'
import { periodFromPreset } from '../lib/period'
import { PeriodFilter } from '../components/PeriodFilter'
import { Kpi } from '../components/Kpi'
import { BarList } from '../components/BarList'
import { SalesChart } from '../components/SalesChart'

const CHANNEL_COLOR: Record<SaleChannel, string> = { loja_fisica: 'var(--series-1)', loja_virtual: 'var(--series-2)' }

export default function Dashboard() {
  const db = useDB()
  const [period, setPeriod] = useState(() => periodFromPreset('30d'))
  const [topBy, setTopBy] = useState<'qtd' | 'valor'>('qtd')

  const data = useMemo(() => {
    const sales = salesInPeriod(db, period)
    const top = topProducts(sales)
    return {
      sales,
      s: summary(sales),
      top: topBy === 'qtd' ? top : [...top].sort((a, b) => b.revenue - a.revenue),
      channels: byChannel(sales),
      payments: byPayment(sales),
      sellers: sellerRanking(db, sales).filter((r) => r.count > 0).slice(0, 5),
      series: timeSeries(sales, period),
      fin: financeInPeriod(db, period),
      stock: stockValue(db),
    }
  }, [db, period, topBy])

  const { s, fin, stock } = data
  const channelTotal = data.channels.reduce((a, c) => a + c.total, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral das vendas, produtos e caixa.</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid kpis">
        <Kpi highlight label="Valor vendido" icon={<DollarSign size={16} />} value={money(s.total)} hint={`${int(s.count)} vendas no período`} />
        <Kpi label="Ticket médio" icon={<Receipt size={16} />} value={money(s.avgTicket)} hint="Valor médio por venda" />
        <Kpi label="Itens vendidos" icon={<ShoppingBag size={16} />} value={int(s.items)} hint={`${data.top.length} produtos diferentes`} />
        <Kpi
          label="Saldo financeiro"
          icon={<Wallet size={16} />}
          value={<span style={{ color: fin.balance < 0 ? 'var(--bad)' : undefined }}>{money(fin.balance)}</span>}
          hint={`Entradas ${money(fin.income)} · Saídas ${money(fin.expense)}`}
        />
        <Kpi label="Estoque" icon={<Package size={16} />} value={`${int(stock.units)} un.`} hint={`${money(stock.sale)} em preço de venda`} />
      </div>

      <div className="grid cols-3-1" style={{ marginBottom: 16 }}>
        <div className="card fill">
          <div className="card-head">
            <div>
              <h2>Valor vendido</h2>
              <p>{data.series.bucketDays === 1 ? 'Por dia' : data.series.bucketDays === 7 ? 'Por semana' : 'Por mês'}</p>
            </div>
          </div>
          <SalesChart buckets={data.series.buckets} bucketDays={data.series.bucketDays} />
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-head"><h2>Origem das vendas</h2></div>
            {channelTotal === 0 ? (
              <div className="empty">Sem vendas no período.</div>
            ) : (
              <>
                <div className="split" role="img" aria-label="Divisão por canal">
                  {data.channels.map((c) => (
                    <div key={c.key} style={{ width: `${(c.total / channelTotal) * 100}%`, background: CHANNEL_COLOR[c.key] }} title={`${CHANNEL_LABEL[c.key]}: ${money(c.total)}`} />
                  ))}
                </div>
                <table className="table" style={{ marginTop: 12 }}>
                  <tbody>
                    {data.channels.map((c) => (
                      <tr key={c.key}>
                        <td style={{ paddingLeft: 0 }}>
                          <span className="legend-item"><span className="swatch" style={{ background: CHANNEL_COLOR[c.key] }} />{CHANNEL_LABEL[c.key]}</span>
                        </td>
                        <td className="r num">{Math.round((c.total / channelTotal) * 100)}%</td>
                        <td className="r num" style={{ paddingRight: 0 }}>{money(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          <div className="card">
            <div className="card-head"><h2>Formas de pagamento</h2></div>
            <BarList
              ranked={false}
              items={data.payments.map((p) => ({ key: p.key, label: PAYMENT_LABEL[p.key], value: p.total, display: money(p.total), secondary: `${p.count}x` }))}
            />
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Produtos mais vendidos</h2>
              <p>Top 8 do período</p>
            </div>
            <div className="segmented">
              <button className={topBy === 'qtd' ? 'on' : ''} onClick={() => setTopBy('qtd')}>Quantidade</button>
              <button className={topBy === 'valor' ? 'on' : ''} onClick={() => setTopBy('valor')}>Valor</button>
            </div>
          </div>
          <BarList
            items={data.top.slice(0, 8).map((p) => ({
              key: p.productId,
              label: p.name,
              value: topBy === 'qtd' ? p.quantity : p.revenue,
              display: topBy === 'qtd' ? `${int(p.quantity)} un.` : money(p.revenue),
              secondary: topBy === 'qtd' ? money(p.revenue) : `${int(p.quantity)} un.`,
            }))}
          />
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Top vendedores</h2>
                <p>Loja física</p>
              </div>
              <Link to="/vendedores" className="btn sm">Ver ranking</Link>
            </div>
            <BarList
              items={data.sellers.map((r) => ({ key: r.sellerId, label: r.name, value: r.total, display: money(r.total), secondary: `${r.count} ${r.count === 1 ? 'venda' : 'vendas'}` }))}
            />
          </div>
          <div className="card">
            <div className="card-head">
              <h2>Estoque baixo</h2>
              <Link to="/estoque" className="btn sm">Ir para estoque</Link>
            </div>
            {stock.low.length === 0 ? (
              <div className="empty">Nenhum produto abaixo do mínimo.</div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {stock.low.map((p) => (
                  <div key={p.id} className="alert">
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '0.82rem' }}>{p.stock} em estoque · mínimo {p.minStock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
