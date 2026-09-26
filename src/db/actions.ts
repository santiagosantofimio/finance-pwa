import { addMonths, monthBounds, type ISODate, type ISOMonth } from '../lib/dates'
import { createId } from '../lib/id'
import { requestPersistentStorage } from '../lib/storage'
import { SETTING_KEYS, db, getSetting, setSetting } from './database'
import type { Budget, Category, PaymentMethod, Transaction, TransactionKind } from './types'

export const LAST_PAYMENT_METHOD_KEY = 'lastPaymentMethod'

export interface TransactionDraft {
  kind: TransactionKind
  amount: number
  categoryId: string
  date: ISODate
  paymentMethod: PaymentMethod
  note: string
}

export async function saveTransaction(draft: TransactionDraft, existingId?: string): Promise<Transaction> {
  const persistence = requestPersistentStorage()
  const now = Date.now()
  const note = draft.note.trim()
  const transaction = await db.transaction('rw', [db.transactions, db.settings], async () => {
    const existing = existingId ? await db.transactions.get(existingId) : undefined
    const record: Transaction = {
      id: existing?.id ?? createId(),
      kind: draft.kind,
      amount: draft.amount,
      categoryId: draft.categoryId,
      date: draft.date,
      paymentMethod: draft.paymentMethod,
      ...(note ? { note } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.transactions.put(record)
    await setSetting(LAST_PAYMENT_METHOD_KEY, draft.paymentMethod)
    if ((await getSetting<number>(SETTING_KEYS.firstUseAt)) === undefined) {
      await setSetting(SETTING_KEYS.firstUseAt, now)
    }
    return record
  })
  await persistence
  return transaction
}

export async function deleteTransaction(id: string): Promise<Transaction | undefined> {
  const existing = await db.transactions.get(id)
  if (existing) await db.transactions.delete(id)
  return existing
}

export async function restoreTransaction(transaction: Transaction): Promise<void> {
  await db.transactions.put(transaction)
}

export async function setBudget(categoryId: string, month: ISOMonth, limit: number | null): Promise<void> {
  if (limit === null) {
    await db.budgets.delete([categoryId, month])
    return
  }
  await db.budgets.put({ categoryId, month, limit })
}

export async function copyBudgetsFromPreviousMonth(month: ISOMonth): Promise<number> {
  const previous = await db.budgets.where('month').equals(addMonths(month, -1)).toArray()
  const copies: Budget[] = previous.map((budget) => ({ ...budget, month }))
  await db.budgets.bulkPut(copies)
  return copies.length
}

export async function previousMonthBudgetCount(month: ISOMonth): Promise<number> {
  return db.budgets.where('month').equals(addMonths(month, -1)).count()
}

export interface CategoryDraft {
  kind: TransactionKind
  name: string
  color: string
  icon: string
}

export async function saveCategory(draft: CategoryDraft, existingId?: string): Promise<Category> {
  return db.transaction('rw', db.categories, async () => {
    const existing = existingId ? await db.categories.get(existingId) : undefined
    if (existing) {
      const updated: Category = { ...existing, name: draft.name.trim(), color: draft.color, icon: draft.icon }
      await db.categories.put(updated)
      return updated
    }
    const last = await db.categories.where('kind').equals(draft.kind).sortBy('order')
    const category: Category = {
      id: createId(),
      kind: draft.kind,
      name: draft.name.trim(),
      color: draft.color,
      icon: draft.icon,
      order: (last.at(-1)?.order ?? -1) + 1,
      builtIn: false,
      archived: false,
    }
    await db.categories.add(category)
    return category
  })
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  await db.categories.update(id, { archived })
}

export async function deleteCategoryIfUnused(id: string): Promise<boolean> {
  return db.transaction('rw', [db.categories, db.transactions, db.budgets], async () => {
    const used = await db.transactions.where('categoryId').equals(id).count()
    if (used > 0) return false
    await db.budgets.where('categoryId').equals(id).delete()
    await db.categories.delete(id)
    return true
  })
}

export async function markBackupDone(timestamp: number = Date.now()): Promise<void> {
  await setSetting(SETTING_KEYS.lastBackupAt, timestamp)
}

export interface BudgetImpact {
  spent: number
  limit: number
}

export async function budgetImpact(categoryId: string, month: ISOMonth): Promise<BudgetImpact | null> {
  const budget = await db.budgets.get([categoryId, month])
  if (!budget) return null
  const { start, end } = monthBounds(month)
  let spent = 0
  await db.transactions
    .where('date')
    .between(start, end, true, true)
    .filter((transaction) => transaction.kind === 'expense' && transaction.categoryId === categoryId)
    .each((transaction) => {
      spent += transaction.amount
    })
  return { spent, limit: budget.limit }
}
