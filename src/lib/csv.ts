import { PAYMENT_METHOD_LABELS, TRANSACTION_KIND_LABELS } from '../db/labels'
import type { Category, Transaction } from '../db/types'

const BYTE_ORDER_MARK = '\uFEFF'

function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const safe = neutralizeFormula(value)
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transactionsToCsv(transactions: readonly Transaction[], categories: readonly Category[]): string {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const header = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Medio de pago', 'Nota']
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((transaction) => [
      transaction.date,
      TRANSACTION_KIND_LABELS[transaction.kind],
      categoryNames.get(transaction.categoryId) ?? 'Sin categoría',
      transaction.kind === 'income' ? transaction.amount : -transaction.amount,
      PAYMENT_METHOD_LABELS[transaction.paymentMethod],
      transaction.note ?? '',
    ])
  return BYTE_ORDER_MARK + [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n') + '\r\n'
}
