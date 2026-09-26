import { describe, expect, it } from 'vitest'
import type { Transaction } from '../db/types'
import { budgetStatus, summarizeTransactions } from './budget'

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    kind: 'expense',
    amount: 10_000,
    categoryId: 'groceries',
    date: '2026-09-01',
    paymentMethod: 'cash',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('budgetStatus', () => {
  it('is ok below the warning threshold', () => {
    expect(budgetStatus(50_000, 100_000)).toMatchObject({ state: 'ok', remaining: 50_000, ratio: 0.5 })
  })

  it('warns from 80 % of the limit', () => {
    expect(budgetStatus(80_000, 100_000).state).toBe('warning')
    expect(budgetStatus(100_000, 100_000).state).toBe('warning')
  })

  it('is over when spending exceeds the limit', () => {
    expect(budgetStatus(120_000, 100_000)).toMatchObject({ state: 'over', remaining: -20_000 })
  })

  it('handles a zero limit', () => {
    expect(budgetStatus(0, 0).state).toBe('ok')
    expect(budgetStatus(1, 0).state).toBe('over')
  })
})

describe('summarizeTransactions', () => {
  it('totals income, expenses and balance by category', () => {
    const summary = summarizeTransactions([
      transaction({ kind: 'income', amount: 3_000_000, categoryId: 'salary' }),
      transaction({ amount: 200_000, categoryId: 'groceries' }),
      transaction({ amount: 50_000, categoryId: 'groceries' }),
      transaction({ amount: 80_000, categoryId: 'transport' }),
    ])
    expect(summary.income).toBe(3_000_000)
    expect(summary.expense).toBe(330_000)
    expect(summary.balance).toBe(2_670_000)
    expect(summary.expenseByCategory.get('groceries')).toBe(250_000)
    expect(summary.expenseByCategory.get('transport')).toBe(80_000)
    expect(summary.incomeByCategory.get('salary')).toBe(3_000_000)
  })

  it('returns zeros for no transactions', () => {
    expect(summarizeTransactions([])).toMatchObject({ income: 0, expense: 0, balance: 0 })
  })
})
