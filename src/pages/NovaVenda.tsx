import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, CreditCard, FileText, Globe, Minus, Plus, QrCode, Search, ShoppingCart, Store, Trash2, Wallet } from 'lucide-react'
import { repo, useDB } from '../data/store'
import { CHANNEL_LABEL, PAYMENT_LABEL, PRODUCT_CATEGORIES, type PaymentMethod, type Sale, type SaleChannel } from '../data/types'
import { money, parseMoney } from '../lib/format'
import { Modal } from '../components/Modal'
import { useToast } from '../components/toast'
import { SaleDetails } from './RelatorioVendas'

const PAYMENT_ICON: Record<PaymentMethod, typeof Wallet> = {
  dinheiro: Banknote,
  pix: QrCode,
  credito: CreditCard,
  debito: Wallet,
  boleto: FileText,
}

interface CartLine { productId: string; quantity: number }

export default function NovaVenda() {
  const db = useDB()
  const { run, toast } = useToast()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [channel, setChannel] = useState<SaleChannel>('loja_fisica')
  const [sellerId, setSellerId] = useState('')
  const [payment, setPayment] = useState<PaymentMethod | ''>('')
  const [discountMode, setDiscountMode] = useState<'valor' | 'pct'>('valor')
  const [discountInput, setDiscountInput] = useState('')
  const [customer, setCustomer] = useState('')
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState<Sale | null>(null)

  const products = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.products
      .filter((p) => !term || `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(term))
      .filter((p) => !category || p.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [db.products, q, category])

  const lines = cart
    .map((l) => ({ ...l, product: db.products.find((p) => p.id === l.productId)! }))
    .filter((l) => l.product)
  const subtotal = lines.reduce((a, l) => a + l.quantity * l.product.salePrice, 0)
  const rawDiscount = parseMoney(discountInput)
  const discount = Math.min(subtotal, Math.max(0, discountMode === 'pct' ? (subtotal * rawDiscount) / 100 : rawDiscount))
  const total = subtotal - discount
  const activeSellers = db.sellers.filter((s) => s.active)

  function add(productId: string) {
    const p = db.products.find((x) => x.id === productId)!
    const inCart = cart.find((l) => l.productId === productId)?.quantity ?? 0
    if (inCart + 1 > p.stock) {
      toast(`Só há ${p.stock} unidade(s) de ${p.name} em estoque.`, 'error')
      return
    }
    setCart((c) => (inCart ? c.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { productId, quantity: 1 }]))
  }

  function setQty(productId: string, qty: number) {
    const p = db.products.find((x) => x.id === productId)!
    const n = Math.max(1, Math.min(Math.floor(qty) || 1, p.stock))
    setCart((c) => c.map((l) => (l.productId === productId ? { ...l, quantity: n } : l)))
  }

  function reset() {
    setCart([])
    setPayment('')
    setDiscountInput('')
    setCustomer('')
    setNotes('')
  }

  const missing = [
    lines.length === 0 && 'adicione itens',
    channel === 'loja_fisica' && !sellerId && 'selecione o vendedor',
    !payment && 'escolha a forma de pagamento',
  ].filter(Boolean) as string[]

  async function finish() {
    let sale: Sale | undefined
    const ok = await run(async () => {
      if (missing.length) throw new Error(`Para finalizar: ${missing.join(', ')}.`)
      sale = await repo.createSale({
        channel,
        sellerId: channel === 'loja_fisica' ? sellerId : undefined,
        paymentMethod: payment as PaymentMethod,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.product.salePrice })),
        discount,
        customerName: customer,
        notes,
      })
    })
    if (ok && sale) {
      setDone(sale)
      reset()
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Nova venda</h1>
          <p>Selecione os produtos, a origem da venda e a forma de pagamento.</p>
        </div>
      </div>

      <div className="pdv">
        <div className="card">
          <div className="card-head">
            <h2>Produtos</h2>
            <div className="btn-row">
              <div className="search" style={{ width: 240 }}>
                <Search size={16} />
                <input className="input" placeholder="Buscar nome, marca ou SKU" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
              <select className="input" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
                <option value="">Todas</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="product-grid">
            {products.map((p) => {
              const inCart = cart.find((l) => l.productId === p.id)?.quantity ?? 0
              return (
                <button key={p.id} className="product-tile" onClick={() => add(p.id)} disabled={p.stock - inCart <= 0}>
                  <span className="name">{p.name}</span>
                  <span className="meta">{p.brand}{p.volumeMl ? ` · ${p.volumeMl} ml` : ''}</span>
                  <span className="meta">
                    {p.stock === 0 ? <span className="badge bad">Sem estoque</span> : `${p.stock - inCart} disponíveis`}
                    {inCart > 0 && <span className="badge accent" style={{ marginLeft: 6 }}>{inCart} no carrinho</span>}
                  </span>
                  <span className="price">{money(p.salePrice)}</span>
                </button>
              )
            })}
            {products.length === 0 && <div className="empty">Nenhum produto encontrado.</div>}
          </div>
        </div>

        <div className="card" style={{ position: 'sticky', top: 16 }}>
          <div className="card-head">
            <h2><ShoppingCart size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />Carrinho</h2>
            {lines.length > 0 && <button className="btn sm ghost" onClick={() => setCart([])}>Limpar</button>}
          </div>

          {lines.length === 0 ? (
            <div className="empty">Clique em um produto para adicioná-lo.</div>
          ) : (
            lines.map((l) => (
              <div key={l.productId} className="cart-item">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.product.name}</div>
                  <div className="subtle num">{money(l.product.salePrice)} cada · {money(l.quantity * l.product.salePrice)}</div>
                </div>
                <div className="qty">
                  <button onClick={() => (l.quantity > 1 ? setQty(l.productId, l.quantity - 1) : setCart((c) => c.filter((x) => x.productId !== l.productId)))} aria-label="Diminuir"><Minus size={14} /></button>
                  <input value={l.quantity} onChange={(e) => setQty(l.productId, Number(e.target.value))} aria-label="Quantidade" className="num" />
                  <button onClick={() => add(l.productId)} aria-label="Aumentar"><Plus size={14} /></button>
                </div>
                <button className="btn ghost icon danger" onClick={() => setCart((c) => c.filter((x) => x.productId !== l.productId))} aria-label="Remover item">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}

          <div className="section-label">Origem da venda</div>
          <div className="choice-grid">
            {(['loja_fisica', 'loja_virtual'] as SaleChannel[]).map((c) => (
              <button key={c} className={`choice ${channel === c ? 'on' : ''}`} onClick={() => setChannel(c)}>
                {c === 'loja_fisica' ? <Store size={18} /> : <Globe size={18} />} {CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>

          {channel === 'loja_fisica' && (
            <>
              <div className="section-label">Vendedor</div>
              <select className="input" value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
                <option value="">Selecione o vendedor…</option>
                {activeSellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}

          <div className="section-label">Forma de pagamento</div>
          <div className="choice-grid">
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => {
              const Icon = PAYMENT_ICON[m]
              return (
                <button key={m} className={`choice ${payment === m ? 'on' : ''}`} onClick={() => setPayment(m)}>
                  <Icon size={18} /> {PAYMENT_LABEL[m]}
                </button>
              )
            })}
          </div>

          <div className="section-label">Desconto e cliente</div>
          <div className="form-grid">
            <div className="field">
              <div className="btn-row" style={{ gap: 6 }}>
                <input className="input" style={{ flex: 1, minWidth: 0 }} inputMode="decimal" placeholder="0" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} aria-label="Desconto" />
                <div className="segmented">
                  <button className={discountMode === 'valor' ? 'on' : ''} onClick={() => setDiscountMode('valor')}>R$</button>
                  <button className={discountMode === 'pct' ? 'on' : ''} onClick={() => setDiscountMode('pct')}>%</button>
                </div>
              </div>
            </div>
            <div className="field">
              <input className="input" placeholder="Nome do cliente (opcional)" value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Cliente" />
            </div>
            <div className="field full">
              <input className="input" placeholder="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Observação" />
            </div>
          </div>

          <div className="totals num">
            <div className="row"><span className="muted">Subtotal</span><span>{money(subtotal)}</span></div>
            {discount > 0 && <div className="row"><span className="muted">Desconto</span><span style={{ color: 'var(--bad)' }}>− {money(discount)}</span></div>}
            <div className="row grand"><span>Total</span><span>{money(total)}</span></div>
          </div>

          <button className="btn primary lg" style={{ width: '100%' }} onClick={finish} disabled={lines.length === 0}>
            <CheckCircle2 size={20} /> Finalizar venda
          </button>
          {lines.length > 0 && missing.length > 0 && <p className="subtle" style={{ textAlign: 'center', marginBottom: 0 }}>Falta: {missing.join(', ')}.</p>}
        </div>
      </div>

      {done && (
        <Modal
          title={`Venda #${done.number} registrada`}
          onClose={() => setDone(null)}
          footer={<button className="btn primary" onClick={() => setDone(null)}>Nova venda</button>}
        >
          <SaleDetails sale={done} />
        </Modal>
      )}
    </>
  )
}
