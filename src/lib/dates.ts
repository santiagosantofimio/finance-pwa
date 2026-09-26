export type ISODate = string
export type ISOMonth = string

const DAY_MS = 24 * 60 * 60 * 1000

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const isoMonthPattern = /^(\d{4})-(\d{2})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toISOMonth(date: Date): ISOMonth {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function currentMonth(now: Date = new Date()): ISOMonth {
  return toISOMonth(now)
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false
  const match = isoDatePattern.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function isISOMonth(value: unknown): value is ISOMonth {
  if (typeof value !== 'string') return false
  const match = isoMonthPattern.exec(value)
  if (!match) return false
  const month = Number(match[2])
  return month >= 1 && month <= 12
}

export function parseISODate(value: ISODate): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function monthOf(date: ISODate): ISOMonth {
  return date.slice(0, 7)
}

export function addMonths(month: ISOMonth, delta: number): ISOMonth {
  const [year, monthNumber] = month.split('-').map(Number)
  return toISOMonth(new Date(year, monthNumber - 1 + delta, 1))
}

export function monthBounds(month: ISOMonth): { start: ISODate; end: ISODate } {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return { start: `${month}-01`, end: `${month}-${pad(lastDay)}` }
}

export function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / DAY_MS)
}

const dayMonthFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })
const fullDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

export function formatShortDate(value: ISODate): string {
  return dayMonthFormatter.format(parseISODate(value))
}

export function formatLongDate(value: ISODate): string {
  return fullDateFormatter.format(parseISODate(value))
}

export function formatMonth(month: ISOMonth): string {
  return monthFormatter.format(parseISODate(`${month}-01`))
}
