const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR')
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

export const money = (v: number) => brl.format(v || 0)
export const int = (v: number) => num.format(v || 0)
export const date = (iso: string) => dateFmt.format(new Date(iso))
export const dateTime = (iso: string) => dateTimeFmt.format(new Date(iso))
export const dayMonth = (d: Date) => shortDate.format(d)

/** Valor compacto para eixos: R$ 12,5 mil */
export function moneyCompact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${Math.round(v)}`
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function parseMoney(input: string): number {
  const s = input.trim()
  if (!s) return 0
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** yyyy-mm-dd na data local (para inputs type=date). */
export function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromInputDate(s: string, endOfDay = false) {
  const [y, m, d] = s.split('-').map(Number)
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)
}
