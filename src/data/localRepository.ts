import type { Repository } from './repository'
import type { Database, Sale, StockMovement } from './types'
import { buildDemoDatabase } from './seed'
import { uid } from '../lib/id'

const STORAGE_KEY = 'perfumaria-db-v1'

const empty = (): Database => ({ version: 1, products: [], movements: [], sellers: [], sales: [], finance: [] })
const round = (n: number) => Math.round(n * 100) / 100

/**
 * Implementação temporária: guarda tudo no localStorage do navegador.
 * Cada função recebe/retorna Promises para que a troca pelo Supabase
 * não mude a forma como as telas chamam a camada de dados.
 */
export function createLocalRepository(onChange: (db: Database) => void): Repository {
  let db: Database = read()

  function read(): Database {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as Database
    } catch {
      /* armazenamento indisponível ou corrompido */
    }
    const demo = buildDemoDatabase()
    write(demo)
    return demo
  }

  function write(next: Database) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignora: segue em memória */
    }
  }

  function commit(mutator: (draft: Database) => void) {
    const draft: Database = structuredClone(db)
    mutator(draft)
    db = draft
    write(db)
    onChange(db)
  }

  function findProduct(d: Database, id: string) {
    const p = d.products.find((x) => x.id === id)
    if (!p) throw new Error('Produto não encontrado.')
    return p
  }

  function movement(m: Omit<StockMovement, 'id' | 'date'> & { date?: string }): StockMovement {
    return { id: uid(), date: new Date().toISOString(), ...m }
  }

  return {
    async load() {
      return db
    },

    async createProduct(input) {
      if (db.products.some((p) => p.sku.trim().toLowerCase() === input.sku.trim().toLowerCase())) {
        throw new Error('Já existe um produto com este código (SKU).')
      }
      const product = { ...input, id: uid(), createdAt: new Date().toISOString(), stock: 0 }
      const initial = Math.max(0, Math.floor(input.stock ?? 0))
      commit((d) => {
        product.stock = initial
        d.products.push(product)
        if (initial > 0) {
          d.movements.push(movement({ productId: product.id, productName: product.name, type: 'entrada', quantity: initial, reason: 'Estoque inicial no cadastro' }))
        }
      })
      return product
    },

    async updateProduct(id, patch) {
      if (patch.sku && db.products.some((p) => p.id !== id && p.sku.trim().toLowerCase() === patch.sku!.trim().toLowerCase())) {
        throw new Error('Já existe um produto com este código (SKU).')
      }
      commit((d) => {
        const p = findProduct(d, id)
        const { stock: _ignored, ...rest } = patch
        void _ignored
        Object.assign(p, rest)
      })
    },

    async deleteProduct(id) {
      commit((d) => {
        findProduct(d, id)
        d.products = d.products.filter((p) => p.id !== id)
        // Histórico de vendas e movimentações é mantido (guardam o nome do produto).
      })
    },

    async addStock(productId, quantity, reason) {
      const qty = Math.floor(quantity)
      if (!(qty > 0)) throw new Error('Informe uma quantidade maior que zero.')
      commit((d) => {
        const p = findProduct(d, productId)
        p.stock += qty
        d.movements.push(movement({ productId, productName: p.name, type: 'entrada', quantity: qty, reason: reason || 'Entrada de estoque' }))
      })
    },

    async removeStock(productId, quantity, reason) {
      const qty = Math.floor(quantity)
      if (!(qty > 0)) throw new Error('Informe uma quantidade maior que zero.')
      const p = db.products.find((x) => x.id === productId)
      if (p && qty > p.stock) throw new Error(`Estoque insuficiente. Disponível: ${p.stock}.`)
      commit((d) => {
        const prod = findProduct(d, productId)
        prod.stock -= qty
        d.movements.push(movement({ productId, productName: prod.name, type: 'saida', quantity: qty, reason: reason || 'Remoção de estoque' }))
      })
    },

    async createSeller(name) {
      const seller = { id: uid(), name: name.trim(), active: true, createdAt: new Date().toISOString() }
      if (!seller.name) throw new Error('Informe o nome do vendedor.')
      commit((d) => {
        d.sellers.push(seller)
      })
      return seller
    },

    async updateSeller(id, patch) {
      commit((d) => {
        const s = d.sellers.find((x) => x.id === id)
        if (!s) throw new Error('Vendedor não encontrado.')
        Object.assign(s, patch)
      })
    },

    async deleteSeller(id) {
      if (db.sales.some((s) => s.sellerId === id)) {
        throw new Error('Este vendedor possui vendas registradas. Desative-o em vez de excluir.')
      }
      commit((d) => {
        d.sellers = d.sellers.filter((s) => s.id !== id)
      })
    },

    async createSale(input) {
      if (input.items.length === 0) throw new Error('Adicione pelo menos um item à venda.')
      let seller
      if (input.channel === 'loja_fisica') {
        seller = db.sellers.find((s) => s.id === input.sellerId)
        if (!seller) throw new Error('Selecione o vendedor para vendas na loja física.')
      }
      for (const it of input.items) {
        const p = db.products.find((x) => x.id === it.productId)
        if (!p) throw new Error('Produto não encontrado.')
        if (!(it.quantity > 0)) throw new Error(`Quantidade inválida para ${p.name}.`)
        if (it.quantity > p.stock) throw new Error(`Estoque insuficiente para ${p.name}. Disponível: ${p.stock}.`)
      }
      const items = input.items.map((it) => ({
        productId: it.productId,
        productName: db.products.find((p) => p.id === it.productId)!.name,
        quantity: Math.floor(it.quantity),
        unitPrice: round(it.unitPrice),
      }))
      const subtotal = round(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0))
      const discount = round(Math.min(Math.max(0, input.discount || 0), subtotal))
      const sale: Sale = {
        id: uid(),
        number: db.sales.reduce((m, s) => Math.max(m, s.number), 0) + 1,
        date: input.date ?? new Date().toISOString(),
        channel: input.channel,
        sellerId: seller?.id,
        sellerName: seller?.name,
        paymentMethod: input.paymentMethod,
        items,
        subtotal,
        discount,
        total: round(subtotal - discount),
        customerName: input.customerName?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        status: 'concluida',
      }
      commit((d) => {
        d.sales.push(sale)
        for (const it of items) {
          findProduct(d, it.productId).stock -= it.quantity
          d.movements.push(movement({ productId: it.productId, productName: it.productName, type: 'venda', quantity: it.quantity, reason: `Venda #${sale.number}`, saleId: sale.id, date: sale.date }))
        }
        d.finance.push({ id: uid(), type: 'entrada', category: 'Venda', description: `Venda #${sale.number}`, amount: sale.total, date: sale.date, saleId: sale.id })
      })
      return sale
    },

    async cancelSale(id, reason) {
      const sale = db.sales.find((s) => s.id === id)
      if (!sale) throw new Error('Venda não encontrada.')
      if (sale.status === 'cancelada') throw new Error('Esta venda já foi cancelada.')
      commit((d) => {
        const s = d.sales.find((x) => x.id === id)!
        s.status = 'cancelada'
        s.notes = [s.notes, `Cancelada: ${reason || 'sem motivo informado'}`].filter(Boolean).join(' | ')
        for (const it of s.items) {
          const p = d.products.find((x) => x.id === it.productId)
          if (p) p.stock += it.quantity
          d.movements.push(movement({ productId: it.productId, productName: it.productName, type: 'cancelamento', quantity: it.quantity, reason: `Cancelamento da venda #${s.number}`, saleId: s.id }))
        }
        d.finance.push({ id: uid(), type: 'saida', category: 'Estorno de venda', description: `Estorno da venda #${s.number}${reason ? ` — ${reason}` : ''}`, amount: s.total, date: new Date().toISOString(), saleId: s.id })
      })
    },

    async createFinance(input) {
      const amount = round(input.amount)
      if (!(amount > 0)) throw new Error('Informe um valor maior que zero.')
      const entry = { id: uid(), ...input, amount, description: input.description.trim(), date: input.date ?? new Date().toISOString() }
      commit((d) => {
        d.finance.push(entry)
      })
      return entry
    },

    async deleteFinance(id) {
      const entry = db.finance.find((f) => f.id === id)
      if (entry?.saleId) throw new Error('Lançamentos gerados por vendas não podem ser excluídos. Cancele a venda no relatório.')
      commit((d) => {
        d.finance = d.finance.filter((f) => f.id !== id)
      })
    },

    async resetWithDemoData() {
      commit((d) => Object.assign(d, buildDemoDatabase()))
    },

    async clearAll() {
      commit((d) => Object.assign(d, empty()))
    },
  }
}
