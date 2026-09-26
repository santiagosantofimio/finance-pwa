import type { ISODate, ISOMonth } from '../lib/dates'

export type TransactionKind = 'income' | 'expense'

export const PAYMENT_METHODS = ['cash', 'debit', 'credit', 'nequi', 'daviplata', 'transfer'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export interface Transaction {
  id: string
  kind: TransactionKind
  amount: number
  categoryId: string
  date: ISODate
  paymentMethod: PaymentMethod
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  kind: TransactionKind
  name: string
  color: string
  icon: string
  order: number
  builtIn: boolean
  archived: boolean
}

export interface Budget {
  categoryId: string
  month: ISOMonth
  limit: number
}

export interface Setting {
  key: string
  value: unknown
}
