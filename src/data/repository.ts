import type {
  Database,
  FinanceEntry,
  ID,
  PaymentMethod,
  Product,
  Sale,
  SaleChannel,
  Seller,
} from './types'

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'stock'> & { stock?: number }

export interface SaleInput {
  channel: SaleChannel
  sellerId?: ID
  paymentMethod: PaymentMethod
  items: { productId: ID; quantity: number; unitPrice: number }[]
  discount: number
  customerName?: string
  notes?: string
  date?: string
}

export type FinanceInput = Omit<FinanceEntry, 'id' | 'saleId' | 'date'> & { date?: string }

/**
 * Contrato da camada de dados. Hoje é implementado com localStorage
 * (localRepository.ts). Para migrar para o Supabase basta criar outra
 * implementação deste contrato e trocar a exportação em store.ts —
 * as telas não precisam mudar.
 */
export interface Repository {
  load(): Promise<Database>

  createProduct(input: ProductInput): Promise<Product>
  updateProduct(id: ID, patch: Partial<ProductInput>): Promise<void>
  deleteProduct(id: ID): Promise<void>
  addStock(productId: ID, quantity: number, reason: string): Promise<void>
  removeStock(productId: ID, quantity: number, reason: string): Promise<void>

  createSeller(name: string): Promise<Seller>
  updateSeller(id: ID, patch: Partial<Pick<Seller, 'name' | 'active'>>): Promise<void>
  deleteSeller(id: ID): Promise<void>

  createSale(input: SaleInput): Promise<Sale>
  cancelSale(id: ID, reason: string): Promise<void>

  createFinance(input: FinanceInput): Promise<FinanceEntry>
  deleteFinance(id: ID): Promise<void>

  resetWithDemoData(): Promise<void>
  clearAll(): Promise<void>
}
