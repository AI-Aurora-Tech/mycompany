import { useMemo, useState, type ReactNode } from 'react'
import { Download, Globe, Search, Store, XCircle } from 'lucide-react'
import { repo, useDB } from '../data/store'
import { CHANNEL_LABEL, PAYMENT_LABEL, type PaymentMethod, type Sale, type SaleChannel } from '../data/types'
import { byChannel, byPayment, groupBy, summary } from '../lib/analytics'
import { dateTime, int, money } from '../lib/format'
import { inPeriod, periodFromPreset } from '../lib/period'
import { PeriodFilter } from '../components/PeriodFilter'
import { Kpi } from '../components/Kpi'
import { Modal } from '../components/Modal'
import { Confirm } from '../components/Confirm'
import { useToast } from '../components/toast'

export default function RelatorioVendas() {
  const db = useDB()
  const { run } = useToast()
  const [period, setPeriod] = useState(() => periodFromPreset('30d'))
  const [channel, setChannel] = useState<SaleChannel | ''>('')
  const [payment, setPayment] = useState<PaymentMethod | ''>('')
  const [sellerId, setSellerId] = useState('')
  const [status, setStatus] = useState<'concluida' | 'cancelada' | ''>('concluida')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(50)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [cancelling, setCancelling] = useState<Sale | null>(null)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.sales
      .filter((s) => inPeriod(s.date, period))
      .filter((s) => !channel || s.channel === channel)
      .filter((s) => !payment || s.paymentMethod === payment)
      .filter((s) => !sellerId || s.sellerId === sellerId)
      .filter((s) => !status || s.status === status)
      .filter((s) => !term || `#${s.number} ${s.customerName ?? ''} ${s.sellerName ?? ''} ${s.items.map((i) => i.productName).join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [db.sales, period, channel, payment, sellerId, status, q])

  const completed = rows.filter((s) => s.status === 'concluida')
  const sum = summary(completed)
  const channels = byChannel(completed)
  const payments = byPayment(completed)
  const sellers = groupBy(completed.filter((s) => s.sellerName), (s) => s.sellerName!)

  function exportCsv() {
    const header = ['Número', 'Data', 'Origem', 'Vendedor', 'Pagamento', 'Cliente', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Status']
    const lines = rows.map((s) => [
      s.number,
      dateTime(s.date),
      CHANNEL_LABEL[s.channel],
      s.sellerName ?? '',
      PAYMENT_LABEL[s.paymentMethod],
      s.customerName ?? '',
      s.items.map((i) => `${i.quantity}x ${i.productName}`).join(' + '),
      s.subtotal.toFixed(2).replace('.', ','),
      s.discount.toFixed(2).replace('.', ','),
      s.total.toFixed(2).replace('.', ','),
      s.status === 'concluida' ? 'Concluída' : 'Cancelada',
    ])
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-vendas-${period.from}-a-${period.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Relatório de vendas</h1>
          <p>Origem, forma de pagamento e vendedor de cada venda.</p>
        </div>
        <button className="btn" onClick={exportCsv} disabled={rows.length === 0}><Download size={18} /> Exportar CSV</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>
      <div className="filters">
        <div className="field">
          <label>Origem</label>
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as SaleChannel | '')}>
            <option value="">Todas</option>
            {(Object.keys(CHANNEL_LABEL) as SaleChannel[]).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Pagamento</label>
          <select className="input" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | '')}>
            <option value="">Todos</option>
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Vendedor</label>
          <select className="input" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
            <option value="">Todos</option>
            {db.sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Situação</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
            <option value="">Todas</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Busca</label>
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Nº, cliente, produto…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid kpis">
        <Kpi highlight label="Valor vendido" value={money(sum.total)} hint={`${int(sum.count)} vendas`} />
        <Kpi label="Ticket médio" value={money(sum.avgTicket)} />
        <Kpi label="Itens vendidos" value={int(sum.items)} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: 16 }}>
        <SummaryCard title="Por origem" rows={channels.map((c) => ({ label: CHANNEL_LABEL[c.key], count: c.count, total: c.total }))} total={sum.total} />
        <SummaryCard title="Por forma de pagamento" rows={payments.map((p) => ({ label: PAYMENT_LABEL[p.key], count: p.count, total: p.total }))} total={sum.total} />
        <SummaryCard title="Por vendedor (loja física)" rows={sellers.map((s) => ({ label: s.key, count: s.count, total: s.total }))} total={sellers.reduce((a, s) => a + s.total, 0)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Vendas</h2>
          <span className="subtle">{int(rows.length)} registros</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Origem</th>
                <th>Vendedor</th>
                <th>Pagamento</th>
                <th>Itens</th>
                <th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer' }}>
                  <td className="num" style={{ fontWeight: 650 }}>#{s.number}</td>
                  <td className="num subtle" style={{ whiteSpace: 'nowrap' }}>{dateTime(s.date)}</td>
                  <td><ChannelBadge channel={s.channel} /></td>
                  <td>{s.sellerName ?? <span className="subtle">—</span>}</td>
                  <td>{PAYMENT_LABEL[s.paymentMethod]}</td>
                  <td className="muted" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </td>
                  <td className="r num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {s.status === 'cancelada' ? <span className="badge bad">Cancelada</span> : money(s.total)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="empty">Nenhuma venda encontrada com esses filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="btn" onClick={() => setLimit((l) => l + 50)}>Mostrar mais ({int(rows.length - limit)} restantes)</button>
          </div>
        )}
      </div>

      {selected && (
        <Modal
          title={`Venda #${selected.number}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              {selected.status === 'concluida' && (
                <button className="btn danger" onClick={() => setCancelling(selected)}><XCircle size={16} /> Cancelar venda</button>
              )}
              <button className="btn primary" onClick={() => setSelected(null)}>Fechar</button>
            </>
          }
        >
          <SaleDetails sale={db.sales.find((s) => s.id === selected.id) ?? selected} />
        </Modal>
      )}
      {cancelling && (
        <Confirm
          danger
          title={`Cancelar venda #${cancelling.number}`}
          confirmLabel="Cancelar venda"
          withReason="Motivo do cancelamento"
          message={<>Os itens voltam para o estoque e será lançada uma saída de <strong>{money(cancelling.total)}</strong> no financeiro (estorno).</>}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) =>
            run(() => repo.cancelSale(cancelling.id, reason), 'Venda cancelada.').then((ok) => {
              if (ok) {
                setCancelling(null)
                setSelected(null)
              }
            })
          }
        />
      )}
    </>
  )
}

function ChannelBadge({ channel }: { channel: SaleChannel }) {
  return channel === 'loja_fisica' ? (
    <span className="badge"><Store size={12} /> Loja Física</span>
  ) : (
    <span className="badge accent"><Globe size={12} /> Loja Virtual</span>
  )
}

function SummaryCard({ title, rows, total }: { title: string; rows: { label: string; count: number; total: number }[]; total: number }) {
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3></div>
      {rows.length === 0 ? (
        <div className="empty" style={{ padding: 16 }}>Sem dados.</div>
      ) : (
        <table className="table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td style={{ paddingLeft: 0 }}>{r.label}</td>
                <td className="r num subtle">{r.count}x</td>
                <td className="r num subtle">{total ? Math.round((r.total / total) * 100) : 0}%</td>
                <td className="r num" style={{ paddingRight: 0, fontWeight: 650 }}>{money(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function SaleDetails({ sale }: { sale: Sale }) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="form-grid">
        <Info label="Data" value={dateTime(sale.date)} />
        <Info label="Situação" value={sale.status === 'concluida' ? <span className="badge good">Concluída</span> : <span className="badge bad">Cancelada</span>} />
        <Info label="Origem" value={<ChannelBadge channel={sale.channel} />} />
        <Info label="Pagamento" value={PAYMENT_LABEL[sale.paymentMethod]} />
        {sale.sellerName && <Info label="Vendedor" value={sale.sellerName} />}
        {sale.customerName && <Info label="Cliente" value={sale.customerName} />}
        {sale.notes && <div className="full"><Info label="Observações" value={sale.notes} /></div>}
      </div>
      <table className="table">
        <thead>
          <tr><th style={{ paddingLeft: 0 }}>Produto</th><th className="r">Qtd.</th><th className="r">Unit.</th><th className="r" style={{ paddingRight: 0 }}>Total</th></tr>
        </thead>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.productId}>
              <td style={{ paddingLeft: 0 }}>{i.productName}</td>
              <td className="r num">{i.quantity}</td>
              <td className="r num">{money(i.unitPrice)}</td>
              <td className="r num" style={{ paddingRight: 0 }}>{money(i.quantity * i.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals num" style={{ padding: 0 }}>
        <div className="row"><span className="muted">Subtotal</span><span>{money(sale.subtotal)}</span></div>
        {sale.discount > 0 && <div className="row"><span className="muted">Desconto</span><span>− {money(sale.discount)}</span></div>}
        <div className="row grand"><span>Total</span><span>{money(sale.total)}</span></div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="subtle">{label}</div>
      <div style={{ fontWeight: 550 }}>{value}</div>
    </div>
  )
}
