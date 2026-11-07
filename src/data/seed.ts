import type { Database, FinanceEntry, PaymentMethod, Product, Sale, SaleChannel, Seller, StockMovement } from './types'
import { uid } from '../lib/id'

// Gerador pseudoaleatório com semente fixa: os dados de demonstração
// são sempre os mesmos.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const PRODUCTS: [string, string, string, number, number, number][] = [
  // nome, marca, categoria, ml, custo, venda
  ['Brisa de Jasmim EDP', 'Maison Aurora', 'Feminino', 100, 120, 289.9],
  ['Âmbar Noturno EDP', 'Maison Aurora', 'Masculino', 100, 135, 319.9],
  ['Flor de Laranjeira EDT', 'Casa Lumière', 'Feminino', 75, 70, 179.9],
  ['Cedro & Couro EDP', 'Casa Lumière', 'Masculino', 100, 110, 259.9],
  ['Baunilha Imperial EDP', 'Atelier Solene', 'Unissex', 50, 95, 229.9],
  ['Rosa Velvet Parfum', 'Atelier Solene', 'Feminino', 50, 160, 389.9],
  ['Oceano Azul EDT', 'Vértice', 'Masculino', 100, 60, 149.9],
  ['Citrus Fresh Body Splash', 'Vértice', 'Unissex', 200, 25, 69.9],
  ['Íris Poudré EDP', 'Maison Aurora', 'Feminino', 75, 115, 279.9],
  ['Vetiver Selvagem EDP', 'Atelier Solene', 'Masculino', 100, 125, 299.9],
  ['Algodão Doce Colônia', 'Pétala Kids', 'Infantil', 100, 22, 59.9],
  ['Oud Dourado Extrait', 'Casa Lumière', 'Unissex', 50, 210, 499.9],
  ['Kit Presente Floral', 'Maison Aurora', 'Kit / Presente', 0, 140, 329.9],
  ['Lavanda Provence EDC', 'Vértice', 'Unissex', 150, 35, 89.9],
]

const SELLERS = ['Ana Paula', 'Bruno Costa', 'Carla Mendes', 'Diego Rocha']

const PAYMENTS: PaymentMethod[] = ['pix', 'pix', 'credito', 'credito', 'credito', 'debito', 'dinheiro', 'boleto']

export function buildDemoDatabase(): Database {
  const rand = rng(42)
  const now = new Date()
  const day = 24 * 60 * 60 * 1000
  const start = new Date(now.getTime() - 120 * day)

  const products: Product[] = PRODUCTS.map(([name, brand, category, ml, cost, price], i) => ({
    id: uid(),
    sku: `PRF-${String(i + 1).padStart(4, '0')}`,
    name,
    brand,
    category,
    volumeMl: ml,
    costPrice: cost,
    salePrice: price,
    stock: 0,
    minStock: 5,
    createdAt: start.toISOString(),
  }))

  const sellers: Seller[] = SELLERS.map((name) => ({
    id: uid(),
    name,
    active: true,
    createdAt: start.toISOString(),
  }))

  const movements: StockMovement[] = []
  const finance: FinanceEntry[] = []
  const sales: Sale[] = []

  // Estoque inicial
  const stockMap = new Map<string, number>()
  for (const p of products) {
    const qty = 40 + Math.floor(rand() * 60)
    stockMap.set(p.id, qty)
    movements.push({
      id: uid(),
      productId: p.id,
      productName: p.name,
      type: 'entrada',
      quantity: qty,
      reason: 'Estoque inicial',
      date: start.toISOString(),
    })
  }
  const initialCost = products.reduce((s, p) => s + p.costPrice * (stockMap.get(p.id) ?? 0), 0)
  finance.push({
    id: uid(),
    type: 'saida',
    category: 'Compra de mercadoria',
    description: 'Compra inicial de estoque',
    amount: round(initialCost),
    date: start.toISOString(),
  })

  // Popularidade diferente por produto, para o ranking ficar interessante
  const weights = products.map((_, i) => 1 / (1 + i * 0.35) + rand() * 0.3)
  const sellerWeights = [1.4, 1.0, 1.2, 0.7]
  const pick = <T,>(arr: T[], w: number[]) => {
    const total = w.reduce((a, b) => a + b, 0)
    let r = rand() * total
    for (let i = 0; i < arr.length; i++) {
      r -= w[i]
      if (r <= 0) return arr[i]
    }
    return arr[arr.length - 1]
  }

  let number = 1
  for (let d = 1; d <= 120; d++) {
    const date = new Date(start.getTime() + d * day)
    if (date > now) break
    const weekday = date.getDay()
    const base = weekday === 0 ? 1 : weekday === 6 ? 5 : 3
    const count = Math.floor(base + rand() * 3)

    for (let s = 0; s < count; s++) {
      const saleDate = new Date(date)
      saleDate.setHours(10 + Math.floor(rand() * 9), Math.floor(rand() * 60))
      if (saleDate > now) continue // não cria vendas no futuro (hoje, mais tarde)
      const channel: SaleChannel = rand() < 0.62 ? 'loja_fisica' : 'loja_virtual'
      const seller = channel === 'loja_fisica' ? pick(sellers, sellerWeights) : undefined
      const nItems = rand() < 0.75 ? 1 : 2
      const items: Sale['items'] = []
      for (let k = 0; k < nItems; k++) {
        const p = pick(products, weights)
        if (items.some((it) => it.productId === p.id)) continue
        const qty = rand() < 0.85 ? 1 : 2
        // Reposição automática quando acaba (gera movimentação de entrada)
        if ((stockMap.get(p.id) ?? 0) < qty) {
          const restock = 30
          stockMap.set(p.id, (stockMap.get(p.id) ?? 0) + restock)
          movements.push({ id: uid(), productId: p.id, productName: p.name, type: 'entrada', quantity: restock, reason: 'Reposição de fornecedor', date: saleDate.toISOString() })
          finance.push({ id: uid(), type: 'saida', category: 'Compra de mercadoria', description: `Reposição: ${restock}x ${p.name}`, amount: round(restock * p.costPrice), date: saleDate.toISOString() })
        }
        stockMap.set(p.id, (stockMap.get(p.id) ?? 0) - qty)
        items.push({ productId: p.id, productName: p.name, quantity: qty, unitPrice: p.salePrice })
      }
      const subtotal = round(items.reduce((a, it) => a + it.quantity * it.unitPrice, 0))
      const discount = rand() < 0.15 ? round(subtotal * 0.1) : 0
      const sale: Sale = {
        id: uid(),
        number: number++,
        date: saleDate.toISOString(),
        channel,
        sellerId: seller?.id,
        sellerName: seller?.name,
        paymentMethod: PAYMENTS[Math.floor(rand() * PAYMENTS.length)],
        items,
        subtotal,
        discount,
        total: round(subtotal - discount),
        status: 'concluida',
      }
      sales.push(sale)
      for (const it of items) {
        movements.push({ id: uid(), productId: it.productId, productName: it.productName, type: 'venda', quantity: it.quantity, reason: `Venda #${sale.number}`, saleId: sale.id, date: sale.date })
      }
      finance.push({ id: uid(), type: 'entrada', category: 'Venda', description: `Venda #${sale.number}`, amount: sale.total, date: sale.date, saleId: sale.id })
    }

    // Despesas fixas mensais
    if (date.getDate() === 5) {
      finance.push({ id: uid(), type: 'saida', category: 'Aluguel', description: 'Aluguel da loja', amount: 4500, date: date.toISOString() })
      finance.push({ id: uid(), type: 'saida', category: 'Salários / Comissões', description: 'Folha de pagamento', amount: 9800, date: date.toISOString() })
      finance.push({ id: uid(), type: 'saida', category: 'Contas (água, luz, internet)', description: 'Contas do mês', amount: 780, date: date.toISOString() })
    }
    if (date.getDate() === 15) {
      finance.push({ id: uid(), type: 'saida', category: 'Marketing', description: 'Anúncios redes sociais', amount: 1200, date: date.toISOString() })
    }
  }

  for (const p of products) p.stock = stockMap.get(p.id) ?? 0
  // Deixa dois produtos com estoque baixo para demonstrar o alerta
  for (const p of products.slice(-2)) {
    const remove = Math.max(0, p.stock - 3)
    if (remove > 0) {
      p.stock -= remove
      movements.push({ id: uid(), productId: p.id, productName: p.name, type: 'saida', quantity: remove, reason: 'Transferência para outra unidade', date: now.toISOString() })
    }
  }

  return { version: 1, products, movements, sellers, sales, finance }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
