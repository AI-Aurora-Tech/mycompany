import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, DollarSign, Pencil, Plus, Search, Trash2, AlertTriangle, Package } from 'lucide-react'
import { repo, useDB } from '../data/store'
import { MOVEMENT_LABEL, PRODUCT_CATEGORIES, type MovementType, type Product } from '../data/types'
import { dateTime, int, money, parseMoney } from '../lib/format'
import { stockValue } from '../lib/analytics'
import { Kpi } from '../components/Kpi'
import { Modal } from '../components/Modal'
import { Confirm } from '../components/Confirm'
import { useToast } from '../components/toast'

type Dialog =
  | { kind: 'new' }
  | { kind: 'edit'; product: Product }
  | { kind: 'in' | 'out'; product: Product }
  | { kind: 'delete'; product: Product }
  | null

export default function Estoque() {
  const db = useDB()
  const { run } = useToast()
  const [tab, setTab] = useState<'produtos' | 'movimentacoes'>('produtos')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)

  const stock = stockValue(db)
  const products = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.products
      .filter((p) => !term || `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(term))
      .filter((p) => !category || p.category === category)
      .filter((p) => !onlyLow || p.stock <= p.minStock)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [db.products, q, category, onlyLow])

  const close = () => setDialog(null)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Controle de estoque</h1>
          <p>Cadastre produtos e registre entradas e saídas.</p>
        </div>
        <button className="btn primary" onClick={() => setDialog({ kind: 'new' })}>
          <Plus size={18} /> Novo produto
        </button>
      </div>

      <div className="grid kpis">
        <Kpi label="Produtos cadastrados" icon={<Package size={16} />} value={int(db.products.length)} />
        <Kpi label="Unidades em estoque" icon={<Boxes size={16} />} value={int(stock.units)} />
        <Kpi label="Valor em estoque (custo)" icon={<DollarSign size={16} />} value={money(stock.cost)} hint={`${money(stock.sale)} em preço de venda`} />
        <Kpi
          label="Estoque baixo"
          icon={<AlertTriangle size={16} />}
          value={<span style={{ color: stock.low.length ? 'var(--warn)' : undefined }}>{stock.low.length}</span>}
          hint="Produtos no mínimo ou abaixo"
        />
      </div>

      <div className="card">
        <div className="card-head">
          <div className="segmented">
            <button className={tab === 'produtos' ? 'on' : ''} onClick={() => setTab('produtos')}>Produtos</button>
            <button className={tab === 'movimentacoes' ? 'on' : ''} onClick={() => setTab('movimentacoes')}>Movimentações</button>
          </div>
          {tab === 'produtos' && (
            <div className="btn-row">
              <div className="search" style={{ width: 240 }}>
                <Search size={16} />
                <input className="input" placeholder="Buscar nome, marca ou SKU" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
                <option value="">Todas as categorias</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <label className="btn-row" style={{ gap: 6, fontSize: '0.88rem' }}>
                <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Só estoque baixo
              </label>
            </div>
          )}
        </div>

        {tab === 'produtos' ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className="r">Custo</th>
                  <th className="r">Preço</th>
                  <th className="r">Estoque</th>
                  <th className="r">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="subtle num">{p.sku}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="subtle">{p.brand}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="r num">{money(p.costPrice)}</td>
                    <td className="r num">{money(p.salePrice)}</td>
                    <td className="r">
                      <span className={`badge num ${p.stock === 0 ? 'bad' : p.stock <= p.minStock ? 'warn' : 'good'}`}>
                        {p.stock <= p.minStock && <AlertTriangle size={12} />}
                        {int(p.stock)} un.
                      </span>
                    </td>
                    <td className="r">
                      <div className="btn-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 4 }}>
                        <button className="btn sm" onClick={() => setDialog({ kind: 'in', product: p })} title="Lançar entrada">
                          <ArrowDownToLine size={15} /> Entrada
                        </button>
                        <button className="btn sm" onClick={() => setDialog({ kind: 'out', product: p })} title="Remover do estoque" disabled={p.stock === 0}>
                          <ArrowUpFromLine size={15} /> Remover
                        </button>
                        <button className="btn ghost icon" onClick={() => setDialog({ kind: 'edit', product: p })} aria-label="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn ghost icon danger" onClick={() => setDialog({ kind: 'delete', product: p })} aria-label="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={7} className="empty">Nenhum produto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <Movements />
        )}
      </div>

      {(dialog?.kind === 'new' || dialog?.kind === 'edit') && (
        <ProductForm product={dialog.kind === 'edit' ? dialog.product : undefined} onClose={close} />
      )}
      {(dialog?.kind === 'in' || dialog?.kind === 'out') && <StockForm mode={dialog.kind} product={dialog.product} onClose={close} />}
      {dialog?.kind === 'delete' && (
        <Confirm
          danger
          title="Excluir produto"
          confirmLabel="Excluir produto"
          message={
            <>
              Tem certeza que deseja excluir <strong>{dialog.product.name}</strong>?
              {dialog.product.stock > 0 && <> Ainda há <strong>{dialog.product.stock} unidades</strong> em estoque.</>}
              <p className="subtle">O histórico de vendas e movimentações deste produto será mantido.</p>
            </>
          }
          onClose={close}
          onConfirm={() => run(() => repo.deleteProduct(dialog.product.id), 'Produto excluído.').then((ok) => ok && close())}
        />
      )}
    </>
  )
}

function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { run } = useToast()
  const [f, setF] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    category: product?.category ?? PRODUCT_CATEGORIES[0],
    volumeMl: String(product?.volumeMl ?? ''),
    costPrice: product ? String(product.costPrice).replace('.', ',') : '',
    salePrice: product ? String(product.salePrice).replace('.', ',') : '',
    minStock: String(product?.minStock ?? 5),
    stock: '0',
  })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const cost = parseMoney(f.costPrice)
  const price = parseMoney(f.salePrice)
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0

  async function save() {
    if (!f.name.trim() || !f.sku.trim()) throw new Error('Preencha o código (SKU) e o nome do produto.')
    if (!(price > 0)) throw new Error('Informe o preço de venda.')
    const input = {
      sku: f.sku.trim(),
      name: f.name.trim(),
      brand: f.brand.trim(),
      category: f.category,
      volumeMl: Number(f.volumeMl) || 0,
      costPrice: cost,
      salePrice: price,
      minStock: Math.max(0, Number(f.minStock) || 0),
    }
    if (product) await repo.updateProduct(product.id, input)
    else await repo.createProduct({ ...input, stock: Number(f.stock) || 0 })
  }

  return (
    <Modal
      title={product ? 'Editar produto' : 'Novo produto'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => run(save, product ? 'Produto atualizado.' : 'Produto cadastrado.').then((ok) => ok && onClose())}>
            Salvar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label>Código (SKU) *</label>
          <input className="input" value={f.sku} onChange={set('sku')} placeholder="PRF-0001" autoFocus />
        </div>
        <div className="field">
          <label>Marca</label>
          <input className="input" value={f.brand} onChange={set('brand')} />
        </div>
        <div className="field full">
          <label>Nome do produto *</label>
          <input className="input" value={f.name} onChange={set('name')} placeholder="Ex.: Brisa de Jasmim EDP" />
        </div>
        <div className="field">
          <label>Categoria</label>
          <select className="input" value={f.category} onChange={set('category')}>
            {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Volume (ml)</label>
          <input className="input" type="number" min={0} value={f.volumeMl} onChange={set('volumeMl')} />
        </div>
        <div className="field">
          <label>Preço de custo (R$)</label>
          <input className="input" inputMode="decimal" value={f.costPrice} onChange={set('costPrice')} placeholder="0,00" />
        </div>
        <div className="field">
          <label>Preço de venda (R$) *</label>
          <input className="input" inputMode="decimal" value={f.salePrice} onChange={set('salePrice')} placeholder="0,00" />
        </div>
        <div className="field">
          <label>Estoque mínimo (alerta)</label>
          <input className="input" type="number" min={0} value={f.minStock} onChange={set('minStock')} />
        </div>
        {!product ? (
          <div className="field">
            <label>Estoque inicial</label>
            <input className="input" type="number" min={0} value={f.stock} onChange={set('stock')} />
          </div>
        ) : (
          <div className="field">
            <label>Estoque atual</label>
            <div className="input" style={{ background: 'var(--surface-2)' }}>{product.stock} un. <span className="subtle">(use Entrada/Remover)</span></div>
          </div>
        )}
        {price > 0 && (
          <div className="full subtle">
            Margem: <strong className="num">{margin.toFixed(1).replace('.', ',')}%</strong> · Lucro por unidade: <strong className="num">{money(price - cost)}</strong>
          </div>
        )}
      </div>
    </Modal>
  )
}

const IN_REASONS = ['Compra de fornecedor', 'Devolução de cliente', 'Ajuste de inventário', 'Transferência recebida']
const OUT_REASONS = ['Avaria / quebra', 'Vencimento', 'Uso interno / tester', 'Brinde', 'Ajuste de inventário', 'Transferência para outra unidade', 'Perda / furto']

function StockForm({ mode, product, onClose }: { mode: 'in' | 'out'; product: Product; onClose: () => void }) {
  const { run } = useToast()
  const reasons = mode === 'in' ? IN_REASONS : OUT_REASONS
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')
  const [registerExpense, setRegisterExpense] = useState(true)
  const [unitCost, setUnitCost] = useState(String(product.costPrice).replace('.', ','))

  const n = Math.floor(Number(qty) || 0)
  const isPurchase = mode === 'in' && reason === 'Compra de fornecedor'
  const after = mode === 'in' ? product.stock + n : product.stock - n

  async function save() {
    const fullReason = details.trim() ? `${reason} — ${details.trim()}` : reason
    if (mode === 'in') {
      await repo.addStock(product.id, n, fullReason)
      if (isPurchase && registerExpense && parseMoney(unitCost) > 0) {
        await repo.createFinance({
          type: 'saida',
          category: 'Compra de mercadoria',
          description: `Compra: ${n}x ${product.name}${details.trim() ? ` — ${details.trim()}` : ''}`,
          amount: n * parseMoney(unitCost),
        })
      }
    } else {
      await repo.removeStock(product.id, n, fullReason)
    }
  }

  return (
    <Modal
      title={mode === 'in' ? 'Lançar entrada de estoque' : 'Remover do estoque'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => run(save, mode === 'in' ? 'Entrada registrada.' : 'Remoção registrada.').then((ok) => ok && onClose())}>
            Confirmar
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <div className="alert info">
          <Package size={18} />
          <div>
            <strong>{product.name}</strong>
            <div style={{ fontSize: '0.85rem' }}>Estoque atual: {product.stock} un.</div>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Quantidade</label>
            <input className="input" type="number" min={1} max={mode === 'out' ? product.stock : undefined} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Motivo</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>Observação (opcional)</label>
            <input className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder={mode === 'in' ? 'Ex.: NF 1234, fornecedor X' : 'Ex.: frasco quebrado no transporte'} />
          </div>
          {isPurchase && (
            <>
              <label className="full btn-row" style={{ gap: 6, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={registerExpense} onChange={(e) => setRegisterExpense(e.target.checked)} />
                Lançar saída no financeiro (compra de mercadoria)
              </label>
              {registerExpense && (
                <div className="field">
                  <label>Custo unitário (R$)</label>
                  <input className="input" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                </div>
              )}
              {registerExpense && (
                <div className="field">
                  <label>Total da compra</label>
                  <div className="input num" style={{ background: 'var(--surface-2)' }}>{money(n * parseMoney(unitCost))}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="subtle">
          Estoque após o lançamento: <strong className="num" style={{ color: after < 0 ? 'var(--bad)' : undefined }}>{after} un.</strong>
        </div>
      </div>
    </Modal>
  )
}

function Movements() {
  const db = useDB()
  const [type, setType] = useState<MovementType | ''>('')
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.movements
      .filter((m) => !type || m.type === type)
      .filter((m) => !term || `${m.productName} ${m.reason}`.toLowerCase().includes(term))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 300)
  }, [db.movements, type, q])

  const badge: Record<MovementType, string> = { entrada: 'good', saida: 'warn', venda: 'accent', cancelamento: '' }

  return (
    <>
      <div className="filters">
        <div className="search" style={{ width: 260 }}>
          <Search size={16} />
          <input className="input" placeholder="Buscar produto ou motivo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value as MovementType | '')} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th className="r">Qtd.</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const sign = m.type === 'entrada' || m.type === 'cancelamento' ? '+' : '−'
              return (
                <tr key={m.id}>
                  <td className="num subtle" style={{ whiteSpace: 'nowrap' }}>{dateTime(m.date)}</td>
                  <td style={{ fontWeight: 550 }}>{m.productName}</td>
                  <td><span className={`badge ${badge[m.type]}`}>{MOVEMENT_LABEL[m.type]}</span></td>
                  <td className="r num" style={{ fontWeight: 650, color: sign === '+' ? 'var(--good)' : 'var(--text)' }}>{sign}{m.quantity}</td>
                  <td className="muted">{m.reason}</td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="empty">Nenhuma movimentação encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length === 300 && <p className="subtle" style={{ marginTop: 10 }}>Mostrando as 300 movimentações mais recentes. Use a busca para filtrar.</p>}
    </>
  )
}
