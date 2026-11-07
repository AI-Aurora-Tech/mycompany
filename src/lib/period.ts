import { fromInputDate, toInputDate } from './format'

export type PeriodPreset = 'hoje' | '7d' | '30d' | 'mes' | '90d' | 'tudo' | 'custom'

export interface Period {
  preset: PeriodPreset
  from: string // yyyy-mm-dd
  to: string
}

export const PRESET_LABEL: Record<PeriodPreset, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Este mês',
  '90d': '90 dias',
  tudo: 'Tudo',
  custom: 'Personalizado',
}

export function periodFromPreset(preset: PeriodPreset, current?: Period): Period {
  const today = new Date()
  const back = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
  switch (preset) {
    case 'hoje':
      return { preset, from: toInputDate(today), to: toInputDate(today) }
    case '7d':
      return { preset, from: toInputDate(back(6)), to: toInputDate(today) }
    case '30d':
      return { preset, from: toInputDate(back(29)), to: toInputDate(today) }
    case '90d':
      return { preset, from: toInputDate(back(89)), to: toInputDate(today) }
    case 'mes':
      return { preset, from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toInputDate(today) }
    case 'tudo':
      return { preset, from: '2000-01-01', to: toInputDate(today) }
    case 'custom':
      return { preset, from: current?.from ?? toInputDate(back(29)), to: current?.to ?? toInputDate(today) }
  }
}

export function inPeriod(iso: string, p: Period) {
  const t = new Date(iso).getTime()
  return t >= fromInputDate(p.from).getTime() && t <= fromInputDate(p.to, true).getTime()
}
