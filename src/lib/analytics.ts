import type { Database, PaymentMethod, Sale, SaleChannel } from '../data/types'
import { fromInputDate } from './format'
import { inPeriod, type Period } from './period'

export function salesInPeriod(db: Database, p: Period): Sale[] {
  return db.sales.filter((s) => s.status === 'concluida' && inPeriod(s.date, p))
}

export function summary(sales: Sale[]) {
  const total = sales.reduce((a, s) => a + s.total, 0)
  const items = sales.reduce((a, s) => a + s.items.reduce((b, i) => b + i.quantity, 0), 0)
  return { total, count: sales.length, items, avgTicket: sales.length ? total / sales.length : 0 }
}

export interface ProductRank {
  productId: string
  name: string
  quantity: number
  revenue: number
}

export function topProducts(sales: Sale[]): ProductRank[] {
  const map = new Map<string, ProductRank>()
  for (const s of sales) {
    for (const it of s.items) {
      const r = map.get(it.productId) ?? { productId: it.productId, name: it.productName, quantity: 0, revenue: 0 }
      r.quantity += it.quantity
      // desconto distribuído proporcionalmente entre os itens
      const share = s.subtotal ? (it.quantity * it.unitPrice) / s.subtotal : 0
      r.revenue += it.quantity * it.unitPrice - s.discount * share
      map.set(it.productId, r)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
}

export interface SellerRank {
  sellerId: string
  name: string
  active: boolean
  count: number
  items: number
  total: number
  avgTicket: number
}

export function sellerRanking(db: Database, sales: Sale[]): SellerRank[] {
  const map = new Map<string, SellerRank>()
  for (const seller of db.sellers) {
    map.set(seller.id, { sellerId: seller.id, name: seller.name, active: seller.active, count: 0, items: 0, total: 0, avgTicket: 0 })
  }
  for (const s of sales) {
    if (!s.sellerId) continue
    const r = map.get(s.sellerId) ?? { sellerId: s.sellerId, name: s.sellerName ?? '—', active: false, count: 0, items: 0, total: 0, avgTicket: 0 }
    r.count += 1
    r.items += s.items.reduce((a, i) => a + i.quantity, 0)
    r.total += s.total
    map.set(s.sellerId, r)
  }
  return [...map.values()]
    .map((r) => ({ ...r, avgTicket: r.count ? r.total / r.count : 0 }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
}

export function groupBy<K extends string>(sales: Sale[], key: (s: Sale) => K) {
  const map = new Map<K, { key: K; count: number; total: number }>()
  for (const s of sales) {
    const k = key(s)
    const r = map.get(k) ?? { key: k, count: 0, total: 0 }
    r.count += 1
    r.total += s.total
    map.set(k, r)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export const byChannel = (sales: Sale[]) => groupBy<SaleChannel>(sales, (s) => s.channel)
export const byPayment = (sales: Sale[]) => groupBy<PaymentMethod>(sales, (s) => s.paymentMethod)

/** Série diária (ou semanal, se o período for longo) do valor vendido. */
export function timeSeries(sales: Sale[], p: Period) {
  let start = fromInputDate(p.from)
  const end = fromInputDate(p.to)
  if (p.preset === 'tudo' && sales.length) {
    const first = sales.reduce((m, s) => Math.min(m, new Date(s.date).getTime()), Infinity)
    const d = new Date(first)
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const bucketDays = days > 120 ? 30 : days > 45 ? 7 : 1
  const buckets: { start: Date; total: number; count: number }[] = []
  for (let i = 0; i < days; i += bucketDays) {
    buckets.push({ start: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), total: 0, count: 0 })
  }
  for (const s of sales) {
    const t = new Date(s.date)
    const day = new Date(t.getFullYear(), t.getMonth(), t.getDate())
    const idx = Math.floor(Math.round((day.getTime() - start.getTime()) / 86_400_000) / bucketDays)
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].total += s.total
      buckets[idx].count += 1
    }
  }
  return { buckets, bucketDays }
}

export function financeInPeriod(db: Database, p: Period) {
  const entries = db.finance.filter((f) => inPeriod(f.date, p))
  const income = entries.filter((f) => f.type === 'entrada').reduce((a, f) => a + f.amount, 0)
  const expense = entries.filter((f) => f.type === 'saida').reduce((a, f) => a + f.amount, 0)
  return { entries, income, expense, balance: income - expense }
}

export function stockValue(db: Database) {
  return {
    cost: db.products.reduce((a, p) => a + p.stock * p.costPrice, 0),
    sale: db.products.reduce((a, p) => a + p.stock * p.salePrice, 0),
    units: db.products.reduce((a, p) => a + p.stock, 0),
    low: db.products.filter((p) => p.stock <= p.minStock),
  }
}
