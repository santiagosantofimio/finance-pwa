import { describe, expect, it } from 'vitest'
import type { Transaction } from '../db/types'
import {
  chartScale,
  dailyAllowance,
  dailyTotals,
  daysInMonth,
  expenseUntilDay,
  mostExpensiveDay,
  spendingChange,
  topPaymentMethod,
} from './insights'

let counter = 0
function transaction(overrides: Partial<Transaction>): Transaction {
  counter += 1
  return {
    id: `t${counter}`,
    kind: 'expense',
    amount: 10_000,
    categoryId: 'groceries',
    date: '2026-09-01',
    paymentMethod: 'cash',
    createdAt: counter,
    updatedAt: counter,
    ...overrides,
  }
}

describe('dailyTotals', () => {
  it('buckets expenses and income by day of the month', () => {
    const totals = dailyTotals(
      [
        transaction({ date: '2026-09-01', amount: 5_000 }),
        transaction({ date: '2026-09-01', amount: 7_000 }),
        transaction({ date: '2026-09-30', kind: 'income', amount: 900_000 }),
        transaction({ date: '2026-08-31', amount: 1 }),
      ],
      '2026-09',
    )
    expect(totals.expense).toHaveLength(30)
    expect(totals.expense[0]).toBe(12_000)
    expect(totals.income[29]).toBe(900_000)
    expect(totals.expense.reduce((a, b) => a + b, 0)).toBe(12_000)
  })

  it('knows month lengths', () => {
    expect(daysInMonth('2024-02')).toBe(29)
    expect(daysInMonth('2026-12')).toBe(31)
  })
})

describe('chartScale', () => {
  it('uses the highest value when there is no outlier', () => {
    expect(chartScale([10, 40, 30])).toEqual({ max: 40, clipped: [false, false, false] })
  })

  it('clips a single outlier so the rest stays readable', () => {
    const scale = chartScale([1_300_000, 60_000, 40_000, 0])
    expect(scale.max).toBe(81_000)
    expect(scale.clipped).toEqual([true, false, false, false])
  })

  it('handles empty months', () => {
    expect(chartScale([0, 0])).toEqual({ max: 0, clipped: [false, false] })
  })
})

describe('comparisons', () => {
  it('sums expenses up to a day of the month', () => {
    const list = [
      transaction({ date: '2026-08-03', amount: 100 }),
      transaction({ date: '2026-08-20', amount: 50 }),
      transaction({ date: '2026-08-05', kind: 'income', amount: 999 }),
    ]
    expect(expenseUntilDay(list, 10)).toBe(100)
    expect(expenseUntilDay(list, null)).toBe(150)
  })

  it('computes relative change only with a previous baseline', () => {
    expect(spendingChange(88, 100)).toBeCloseTo(-0.12)
    expect(spendingChange(50, 0)).toBeNull()
  })
})

describe('highlights', () => {
  it('finds the payment method carrying most of the spending', () => {
    const top = topPaymentMethod([
      transaction({ paymentMethod: 'nequi', amount: 60 }),
      transaction({ paymentMethod: 'debit', amount: 30 }),
      transaction({ paymentMethod: 'nequi', amount: 10 }),
      transaction({ paymentMethod: 'credit', kind: 'income', amount: 1_000 }),
    ])
    expect(top).toEqual({ method: 'nequi', share: 0.7 })
    expect(topPaymentMethod([])).toBeNull()
  })

  it('finds the most expensive day and its biggest category', () => {
    const day = mostExpensiveDay([
      transaction({ date: '2026-09-02', amount: 1_300_000, categoryId: 'housing' }),
      transaction({ date: '2026-09-02', amount: 20_000, categoryId: 'dining' }),
      transaction({ date: '2026-09-10', amount: 400_000, categoryId: 'groceries' }),
    ])
    expect(day).toEqual({ date: '2026-09-02', amount: 1_320_000, categoryId: 'housing' })
  })

  it('splits the remaining balance over the days left', () => {
    expect(dailyAllowance(2_806_000, 5)).toBe(561_200)
    expect(dailyAllowance(-5, 5)).toBe(0)
    expect(dailyAllowance(100, 0)).toBe(0)
  })
})
