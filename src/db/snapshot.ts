import { isISODate, isISOMonth } from '../lib/dates'
import { isValidAmount } from '../lib/money'
import { PAYMENT_METHODS, type Budget, type Category, type Setting, type Transaction } from './types'

export const SNAPSHOT_SCHEMA_VERSION = 1

export interface DataSnapshot {
  schemaVersion: number
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  settings: Setting[]
}

export class InvalidSnapshotError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidSnapshotError'
  }
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isKind(value: unknown): value is Transaction['kind'] {
  return value === 'income' || value === 'expense'
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isKind(value.kind) &&
    isValidAmount(value.amount) &&
    isNonEmptyString(value.categoryId) &&
    isISODate(value.date) &&
    (PAYMENT_METHODS as readonly unknown[]).includes(value.paymentMethod) &&
    (value.note === undefined || typeof value.note === 'string') &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt)
  )
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isKind(value.kind) &&
    isNonEmptyString(value.name) &&
    typeof value.color === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.order === 'number' &&
    typeof value.builtIn === 'boolean' &&
    typeof value.archived === 'boolean'
  )
}

function isBudget(value: unknown): value is Budget {
  return (
    isRecord(value) && isNonEmptyString(value.categoryId) && isISOMonth(value.month) && isValidAmount(value.limit)
  )
}

function isSetting(value: unknown): value is Setting {
  return isRecord(value) && isNonEmptyString(value.key) && 'value' in value
}

function validateList<T>(snapshot: UnknownRecord, field: string, guard: (value: unknown) => value is T): T[] {
  const list = snapshot[field]
  if (!Array.isArray(list)) throw new InvalidSnapshotError(`Missing ${field}.`)
  const invalidIndex = list.findIndex((item) => !guard(item))
  if (invalidIndex !== -1) throw new InvalidSnapshotError(`Invalid entry in ${field} at position ${invalidIndex}.`)
  return list
}

export function validateSnapshot(value: unknown): DataSnapshot {
  if (!isRecord(value)) throw new InvalidSnapshotError('Snapshot must be an object.')
  if (value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new InvalidSnapshotError('Unsupported schema version.')
  if (typeof value.exportedAt !== 'string') throw new InvalidSnapshotError('Missing export date.')
  const snapshot: DataSnapshot = {
    schemaVersion: value.schemaVersion,
    exportedAt: value.exportedAt,
    transactions: validateList(value, 'transactions', isTransaction),
    categories: validateList(value, 'categories', isCategory),
    budgets: validateList(value, 'budgets', isBudget),
    settings: validateList(value, 'settings', isSetting),
  }
  const categoryIds = new Set(snapshot.categories.map((category) => category.id))
  if (categoryIds.size !== snapshot.categories.length) throw new InvalidSnapshotError('Duplicate category ids.')
  if (new Set(snapshot.transactions.map((transaction) => transaction.id)).size !== snapshot.transactions.length) {
    throw new InvalidSnapshotError('Duplicate transaction ids.')
  }
  const orphan = [...snapshot.transactions, ...snapshot.budgets].find((entry) => !categoryIds.has(entry.categoryId))
  if (orphan) throw new InvalidSnapshotError(`Unknown category ${orphan.categoryId}.`)
  return snapshot
}
