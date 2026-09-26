import type { PaymentMethod, Transaction } from '../db/types'
import { monthBounds, type ISODate, type ISOMonth } from './dates'

export interface DailyTotals {
  expense: number[]
  income: number[]
}

export function daysInMonth(month: ISOMonth): number {
  return Number(monthBounds(month).end.slice(8, 10))
}

export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10))
}

export function dailyTotals(transactions: readonly Transaction[], month: ISOMonth): DailyTotals {
  const length = daysInMonth(month)
  const expense = Array.from({ length }, () => 0)
  const income = Array.from({ length }, () => 0)
  for (const transaction of transactions) {
    if (!transaction.date.startsWith(month)) continue
    const index = dayOfMonth(transaction.date) - 1
    if (transaction.kind === 'expense') expense[index] += transaction.amount
    else income[index] += transaction.amount
  }
  return { expense, income }
}

export interface ChartScale {
  max: number
  clipped: boolean[]
}

export function chartScale(values: readonly number[]): ChartScale {
  const sorted = [...values].filter((value) => value > 0).sort((a, b) => b - a)
  const [highest = 0, second = 0] = sorted
  const max = second > 0 && highest > second * 2.2 ? Math.round(second * 1.35) : highest
  return { max, clipped: values.map((value) => max > 0 && value > max) }
}

export function expenseUntilDay(transactions: readonly Transaction[], lastDay: number | null): number {
  let total = 0
  for (const transaction of transactions) {
    if (transaction.kind !== 'expense') continue
    if (lastDay !== null && dayOfMonth(transaction.date) > lastDay) continue
    total += transaction.amount
  }
  return total
}

export function spendingChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return (current - previous) / previous
}

export interface PaymentShare {
  method: PaymentMethod
  share: number
}

export function topPaymentMethod(transactions: readonly Transaction[]): PaymentShare | null {
  const totals = new Map<PaymentMethod, number>()
  let total = 0
  for (const transaction of transactions) {
    if (transaction.kind !== 'expense') continue
    totals.set(transaction.paymentMethod, (totals.get(transaction.paymentMethod) ?? 0) + transaction.amount)
    total += transaction.amount
  }
  let best: PaymentShare | null = null
  for (const [method, amount] of totals) {
    if (!best || amount / total > best.share) best = { method, share: amount / total }
  }
  return best
}

export interface ExpensiveDay {
  date: ISODate
  amount: number
  categoryId: string
}

export function mostExpensiveDay(transactions: readonly Transaction[]): ExpensiveDay | null {
  const byDate = new Map<ISODate, { amount: number; top: Transaction }>()
  for (const transaction of transactions) {
    if (transaction.kind !== 'expense') continue
    const entry = byDate.get(transaction.date)
    if (!entry) byDate.set(transaction.date, { amount: transaction.amount, top: transaction })
    else {
      entry.amount += transaction.amount
      if (transaction.amount > entry.top.amount) entry.top = transaction
    }
  }
  let best: ExpensiveDay | null = null
  for (const [date, { amount, top }] of byDate) {
    if (!best || amount > best.amount) best = { date, amount, categoryId: top.categoryId }
  }
  return best
}

export function dailyAllowance(balance: number, daysLeft: number): number {
  if (balance <= 0 || daysLeft <= 0) return 0
  return Math.floor(balance / daysLeft)
}
