import { addMonths, currentMonth, formatMonth, parseISODate, todayISO, type ISODate, type ISOMonth } from './dates'

const groupedFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const percentFormatter = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 0 })
const weekdayDayMonth = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
const weekdayDayMonthYear = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const dayMonth = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' })
const longDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es-CO') + text.slice(1)
}

export function formatGrouped(amount: number): string {
  return groupedFormatter.format(amount)
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$ ${groupedFormatter.format(Math.abs(amount))}`
}

export function formatSignedMoney(amount: number, kind: 'income' | 'expense'): string {
  return kind === 'income' ? `+${formatMoney(amount)}` : formatMoney(amount)
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio)
}

export function formatDayHeading(date: ISODate, today: ISODate = todayISO()): string {
  if (date === today) return 'Hoy'
  const yesterday = new Date(parseISODate(today))
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === todayISO(yesterday)) return 'Ayer'
  const value = parseISODate(date)
  const formatter = value.getFullYear() === parseISODate(today).getFullYear() ? weekdayDayMonth : weekdayDayMonthYear
  return capitalize(formatter.format(value))
}

export function formatDayShort(date: ISODate, today: ISODate = todayISO()): string {
  if (date === today) return 'Hoy'
  const yesterday = new Date(parseISODate(today))
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === todayISO(yesterday)) return 'Ayer'
  const value = parseISODate(date)
  const formatter = value.getFullYear() === parseISODate(today).getFullYear() ? dayMonth : dayMonthYear
  return formatter.format(value).replace('.', '')
}

export function formatMonthName(month: ISOMonth): string {
  return capitalize(monthName.format(parseISODate(`${month}-01`)))
}

export function formatMonthTitle(month: ISOMonth): string {
  return capitalize(formatMonth(month))
}

export function formatRelativeMonth(month: ISOMonth, now: Date = new Date()): string {
  const current = currentMonth(now)
  if (month === current) return 'Este mes'
  if (month === addMonths(current, -1)) return 'Mes pasado'
  return formatMonthTitle(month)
}

export function formatLongDate(timestamp: number): string {
  return longDate.format(new Date(timestamp))
}

export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim()
}
