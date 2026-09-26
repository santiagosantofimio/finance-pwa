import type { Transaction } from '../db/types'

export const BUDGET_WARNING_RATIO = 0.8

export type BudgetState = 'ok' | 'warning' | 'over'

export interface BudgetStatus {
  spent: number
  limit: number
  remaining: number
  ratio: number
  state: BudgetState
}

export function budgetStatus(spent: number, limit: number, warningRatio = BUDGET_WARNING_RATIO): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : spent > 0 ? Infinity : 0
  const state: BudgetState = spent > limit ? 'over' : ratio >= warningRatio ? 'warning' : 'ok'
  return { spent, limit, remaining: limit - spent, ratio, state }
}

export interface MonthSummary {
  income: number
  expense: number
  balance: number
  expenseByCategory: Map<string, number>
  incomeByCategory: Map<string, number>
}

export function summarizeTransactions(transactions: readonly Transaction[]): MonthSummary {
  const expenseByCategory = new Map<string, number>()
  const incomeByCategory = new Map<string, number>()
  let income = 0
  let expense = 0
  for (const transaction of transactions) {
    const totals = transaction.kind === 'income' ? incomeByCategory : expenseByCategory
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount)
    if (transaction.kind === 'income') income += transaction.amount
    else expense += transaction.amount
  }
  return { income, expense, balance: income - expense, expenseByCategory, incomeByCategory }
}
