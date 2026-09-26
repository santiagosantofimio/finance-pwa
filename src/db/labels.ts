import type { PaymentMethod, TransactionKind } from './types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Tarjeta de crédito',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  transfer: 'Transferencia',
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
}
