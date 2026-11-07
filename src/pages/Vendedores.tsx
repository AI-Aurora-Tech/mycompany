import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { repo, useDB } from '../data/store'
import type { Seller } from '../data/types'
import { salesInPeriod, sellerRanking } from '../lib/analytics'
import { int, money } from '../lib/format'
import { periodFromPreset } from '../lib/period'
import { PeriodFilter } from '../components/PeriodFilter'
import { BarList } from '../components/BarList'
import { Modal } from '../components/Modal'
import { Confirm } from '../components/Confirm'
import { useToast } from '../components/toast'

export default function Vendedores() {
  const db = useDB()
  const { run } = useToast()
  const [period, setPeriod] = useState(() => periodFromPreset('mes'))
  const [editing, setEditing] = useState<Seller | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Seller | null>(null)

  const ranking = useMemo(() => sellerRanking(db, salesInPeriod(db, period)), [db, period])
  const total = ranking.reduce((a, r) => a + r.total, 0)
  const active = ranking.filter((r) => r.active || r.count > 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ranking de vendedores</h1>
          <p>Desempenho da equipe nas vendas da loja física.</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid cols-3-1" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Classificação</h2>
            <span className="subtle">Ordenado por valor vendido</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Vendedor</th>
                  <th className="r">Vendas</th>
                  <th className="r">Itens</th>
                  <th className="r">Valor vendido</th>
                  <th className="r">Ticket médio</th>
                  <th className="r">Participação</th>
                </tr>
              </thead>
              <tbody>
                {active.map((r, i) => (
                  <tr key={r.sellerId}>
                    <td><span className={`rank-pos ${i < 3 && r.count > 0 ? `p${i + 1}` : ''}`}>{i + 1}</span></td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>{' '}
                      {!r.active && <span className="badge">Inativo</span>}
                    </td>
                    <td className="r num">{int(r.count)}</td>
                    <td className="r num">{int(r.items)}</td>
                    <td className="r num" style={{ fontWeight: 700 }}>{money(r.total)}</td>
                    <td className="r num">{money(r.avgTicket)}</td>
                    <td className="r num">{total ? `${((r.total / total) * 100).toFixed(1).replace('.', ',')}%` : '—'}</td>
                  </tr>
                ))}
                {active.length === 0 && <tr><td colSpan={7} className="empty">Cadastre vendedores para ver o ranking.</td></tr>}
              </tbody>
              {active.length > 0 && (
                <tfoot>
                  <tr>
                    <td />
                    <td>Total</td>
                    <td className="r num">{int(ranking.reduce((a, r) => a + r.count, 0))}</td>
                    <td className="r num">{int(ranking.reduce((a, r) => a + r.items, 0))}</td>
                    <td className="r num">{money(total)}</td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Valor vendido</h2></div>
          <BarList
            items={active.filter((r) => r.count > 0).map((r) => ({ key: r.sellerId, label: r.name, value: r.total, display: money(r.total), secondary: `${r.count} ${r.count === 1 ? 'venda' : 'vendas'}` }))}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Equipe</h2>
            <p>Somente vendedores ativos aparecem na tela de venda.</p>
          </div>
          <button className="btn primary" onClick={() => setEditing('new')}><Plus size={18} /> Novo vendedor</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Status</th><th className="r">Vendas (total)</th><th className="r">Ações</th></tr>
            </thead>
            <tbody>
              {db.sellers.map((s) => {
                const count = db.sales.filter((x) => x.sellerId === s.id && x.status === 'concluida').length
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.active ? <span className="badge good">Ativo</span> : <span className="badge">Inativo</span>}</td>
                    <td className="r num">{int(count)}</td>
                    <td className="r">
                      <div className="btn-row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn sm" onClick={() => run(() => repo.updateSeller(s.id, { active: !s.active }), s.active ? 'Vendedor desativado.' : 'Vendedor ativado.')}>
                          {s.active ? <><UserX size={15} /> Desativar</> : <><UserCheck size={15} /> Ativar</>}
                        </button>
                        <button className="btn ghost icon" onClick={() => setEditing(s)} aria-label="Editar"><Pencil size={16} /></button>
                        <button className="btn ghost icon danger" onClick={() => setDeleting(s)} aria-label="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {db.sellers.length === 0 && <tr><td colSpan={4} className="empty">Nenhum vendedor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <SellerForm seller={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Confirm
          danger
          title="Excluir vendedor"
          confirmLabel="Excluir"
          message={<>Excluir <strong>{deleting.name}</strong>? Vendedores com vendas registradas não podem ser excluídos — desative-os.</>}
          onClose={() => setDeleting(null)}
          onConfirm={() => run(() => repo.deleteSeller(deleting.id), 'Vendedor excluído.').then((ok) => ok && setDeleting(null))}
        />
      )}
    </>
  )
}

function SellerForm({ seller, onClose }: { seller?: Seller; onClose: () => void }) {
  const { run } = useToast()
  const [name, setName] = useState(seller?.name ?? '')
  const save = () =>
    run(async () => {
      if (!name.trim()) throw new Error('Informe o nome do vendedor.')
      if (seller) await repo.updateSeller(seller.id, { name: name.trim() })
      else await repo.createSeller(name)
    }, seller ? 'Vendedor atualizado.' : 'Vendedor cadastrado.').then((ok) => ok && onClose())
  return (
    <Modal
      title={seller ? 'Editar vendedor' : 'Novo vendedor'}
      onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar</button></>}
    >
      <div className="field">
        <label>Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} autoFocus />
      </div>
    </Modal>
  )
}
