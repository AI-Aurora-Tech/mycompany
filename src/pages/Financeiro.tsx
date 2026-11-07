import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Scale, Search, Trash2 } from 'lucide-react'
import { repo, useDB } from '../data/store'
import { FINANCE_CATEGORIES, type FinanceEntry, type FinanceType } from '../data/types'
import { financeInPeriod } from '../lib/analytics'
import { date, fromInputDate, money, parseMoney, toInputDate } from '../lib/format'
import { periodFromPreset } from '../lib/period'
import { PeriodFilter } from '../components/PeriodFilter'
import { Kpi } from '../components/Kpi'
import { BarList } from '../components/BarList'
import { Modal } from '../components/Modal'
import { Confirm } from '../components/Confirm'
import { useToast } from '../components/toast'

export default function Financeiro() {
  const db = useDB()
  const { run } = useToast()
  const [period, setPeriod] = useState(() => periodFromPreset('mes'))
  const [type, setType] = useState<FinanceType | ''>('')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState<FinanceType | null>(null)
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null)

  const fin = useMemo(() => financeInPeriod(db, period), [db, period])
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return fin.entries
      .filter((f) => !type || f.type === type)
      .filter((f) => !term || `${f.description} ${f.category}`.toLowerCase().includes(term))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [fin.entries, type, q])

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of fin.entries) if (f.type === 'saida') map.set(f.category, (map.get(f.category) ?? 0) + f.amount)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [fin.entries])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Financeiro</h1>
          <p>Entradas e saídas de caixa. Vendas entram automaticamente.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => setCreating('entrada')}><ArrowDownCircle size={18} color="var(--good)" /> Nova entrada</button>
          <button className="btn primary" onClick={() => setCreating('saida')}><ArrowUpCircle size={18} /> Nova saída</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid kpis">
        <Kpi label="Entradas" icon={<ArrowDownCircle size={16} />} value={<span style={{ color: 'var(--good)' }}>{money(fin.income)}</span>} />
        <Kpi label="Saídas" icon={<ArrowUpCircle size={16} />} value={<span style={{ color: 'var(--bad)' }}>{money(fin.expense)}</span>} />
        <Kpi highlight label="Saldo do período" icon={<Scale size={16} />} value={money(fin.balance)} hint={fin.balance >= 0 ? 'Positivo' : 'Negativo'} />
      </div>

      <div className="grid cols-3-1">
        <div className="card">
          <div className="card-head">
            <h2>Lançamentos</h2>
            <div className="btn-row">
              <div className="search" style={{ width: 220 }}>
                <Search size={16} />
                <input className="input" placeholder="Buscar descrição" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="segmented">
                <button className={type === '' ? 'on' : ''} onClick={() => setType('')}>Todos</button>
                <button className={type === 'entrada' ? 'on' : ''} onClick={() => setType('entrada')}>Entradas</button>
                <button className={type === 'saida' ? 'on' : ''} onClick={() => setType('saida')}>Saídas</button>
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="r">Valor</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id}>
                    <td className="num subtle" style={{ whiteSpace: 'nowrap' }}>{date(f.date)}</td>
                    <td>
                      <span style={{ fontWeight: 550 }}>{f.description || '—'}</span>
                      {f.saleId && <span className="badge accent" style={{ marginLeft: 6 }}>Automático</span>}
                    </td>
                    <td className="muted">{f.category}</td>
                    <td className="r num" style={{ fontWeight: 650, color: f.type === 'entrada' ? 'var(--good)' : 'var(--bad)', whiteSpace: 'nowrap' }}>
                      {f.type === 'entrada' ? '+ ' : '− '}{money(f.amount)}
                    </td>
                    <td className="r">
                      {!f.saleId && (
                        <button className="btn ghost icon danger" onClick={() => setDeleting(f)} aria-label="Excluir lançamento"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="empty">Nenhum lançamento no período.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Saídas por categoria</h2></div>
          <BarList ranked={false} items={expensesByCategory.map(([k, v]) => ({ key: k, label: k, value: v, display: money(v) }))} />
        </div>
      </div>

      {creating && <FinanceForm type={creating} onClose={() => setCreating(null)} />}
      {deleting && (
        <Confirm
          danger
          title="Excluir lançamento"
          confirmLabel="Excluir"
          message={<>Excluir “{deleting.description || deleting.category}” de <strong>{money(deleting.amount)}</strong>?</>}
          onClose={() => setDeleting(null)}
          onConfirm={() => run(() => repo.deleteFinance(deleting.id), 'Lançamento excluído.').then((ok) => ok && setDeleting(null))}
        />
      )}
    </>
  )
}

function FinanceForm({ type: initialType, onClose }: { type: FinanceType; onClose: () => void }) {
  const { run } = useToast()
  const [type, setType] = useState<FinanceType>(initialType)
  const [category, setCategory] = useState(FINANCE_CATEGORIES[initialType][0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [day, setDay] = useState(() => toInputDate(new Date()))

  const changeType = (t: FinanceType) => {
    setType(t)
    setCategory(FINANCE_CATEGORIES[t][0])
  }

  const save = () =>
    run(async () => {
      const d = fromInputDate(day)
      const now = new Date()
      d.setHours(now.getHours(), now.getMinutes())
      await repo.createFinance({ type, category, description, amount: parseMoney(amount), date: d.toISOString() })
    }, type === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.').then((ok) => ok && onClose())

  return (
    <Modal
      title={type === 'entrada' ? 'Nova entrada' : 'Nova saída'}
      onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar</button></>}
    >
      <div className="form-grid">
        <div className="field full">
          <div className="segmented">
            <button className={type === 'entrada' ? 'on' : ''} onClick={() => changeType('entrada')}>Entrada</button>
            <button className={type === 'saida' ? 'on' : ''} onClick={() => changeType('saida')}>Saída</button>
          </div>
        </div>
        <div className="field">
          <label>Valor (R$)</label>
          <input className="input" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="field full">
          <label>Categoria</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {FINANCE_CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field full">
          <label>Descrição</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'saida' ? 'Ex.: Pagamento do aluguel de novembro' : 'Ex.: Aporte do sócio'} />
        </div>
      </div>
    </Modal>
  )
}
