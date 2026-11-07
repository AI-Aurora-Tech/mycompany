// Modelos de dados. Os nomes dos campos já seguem o formato que
// usaremos nas tabelas do Supabase (snake_case fica a cargo do mapeamento).

export type ID = string

export interface Product {
  id: ID
  sku: string
  name: string
  brand: string
  category: string // ex.: Feminino, Masculino, Unissex
  volumeMl: number
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  createdAt: string
}

export type MovementType = 'entrada' | 'saida' | 'venda' | 'cancelamento'

export interface StockMovement {
  id: ID
  productId: ID
  productName: string
  type: MovementType
  quantity: number // sempre positivo; o tipo define o sentido
  reason: string
  saleId?: ID
  date: string
}

export interface Seller {
  id: ID
  name: string
  active: boolean
  createdAt: string
}

export type SaleChannel = 'loja_fisica' | 'loja_virtual'

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'credito'
  | 'debito'
  | 'boleto'

export interface SaleItem {
  productId: ID
  productName: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: ID
  number: number
  date: string
  channel: SaleChannel
  sellerId?: ID
  sellerName?: string
  paymentMethod: PaymentMethod
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  customerName?: string
  notes?: string
  status: 'concluida' | 'cancelada'
}

export type FinanceType = 'entrada' | 'saida'

export interface FinanceEntry {
  id: ID
  type: FinanceType
  category: string
  description: string
  amount: number
  date: string
  saleId?: ID
}

export interface Database {
  version: number
  products: Product[]
  movements: StockMovement[]
  sellers: Seller[]
  sales: Sale[]
  finance: FinanceEntry[]
}

export const CHANNEL_LABEL: Record<SaleChannel, string> = {
  loja_fisica: 'Loja Física',
  loja_virtual: 'Loja Virtual',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  boleto: 'Boleto',
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida: 'Remoção',
  venda: 'Venda',
  cancelamento: 'Estorno de venda',
}

export const PRODUCT_CATEGORIES = ['Feminino', 'Masculino', 'Unissex', 'Infantil', 'Kit / Presente']

export const FINANCE_CATEGORIES: Record<FinanceType, string[]> = {
  entrada: ['Venda', 'Aporte', 'Serviço', 'Outros'],
  saida: [
    'Compra de mercadoria',
    'Aluguel',
    'Salários / Comissões',
    'Marketing',
    'Frete',
    'Impostos',
    'Contas (água, luz, internet)',
    'Estorno de venda',
    'Outros',
  ],
}
