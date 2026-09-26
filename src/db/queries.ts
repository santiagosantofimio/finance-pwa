import { useLiveQuery } from 'dexie-react-hooks'
import { monthBounds, type ISOMonth } from '../lib/dates'
import { SETTING_KEYS, db } from './database'
import type { Budget, Category, Setting, Transaction } from './types'

export function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), [])
}

export function useCategoryMap(): Map<string, Category> | undefined {
  const categories = useCategories()
  return categories && new Map(categories.map((category) => [category.id, category]))
}

export function useMonthTransactions(month: ISOMonth): Transaction[] | undefined {
  return useLiveQuery(async () => {
    const { start, end } = monthBounds(month)
    const transactions = await db.transactions.where('date').between(start, end, true, true).toArray()
    return sortTransactionsNewestFirst(transactions)
  }, [month])
}

export function useAllTransactions(): Transaction[] | undefined {
  return useLiveQuery(async () => sortTransactionsNewestFirst(await db.transactions.toArray()), [])
}

export function useKeyedLiveQuery<T>(key: string | null, query: () => Promise<T>): T | undefined {
  const result = useLiveQuery(async () => (key === null ? null : { key, value: await query() }), [key])
  return result && result.key === key ? result.value : undefined
}

export function useTransactionCount(): number | undefined {
  return useLiveQuery(() => db.transactions.count(), [])
}

export function useMonthBudgets(month: ISOMonth): Budget[] | undefined {
  return useLiveQuery(() => db.budgets.where('month').equals(month).toArray(), [month])
}

export function useCategoryUsage(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const usage = new Map<string, number>()
    await db.transactions.each((transaction) => {
      usage.set(transaction.categoryId, (usage.get(transaction.categoryId) ?? 0) + 1)
    })
    return usage
  }, [])
}

export function useSettings(): Map<string, unknown> | undefined {
  return useLiveQuery(async () => {
    const settings: Setting[] = await db.settings.toArray()
    return new Map(settings.map((setting) => [setting.key, setting.value]))
  }, [])
}

export function useBackupState() {
  const settings = useSettings()
  if (!settings) return undefined
  const lastBackupAt = settings.get(SETTING_KEYS.lastBackupAt)
  const firstUseAt = settings.get(SETTING_KEYS.firstUseAt)
  return {
    lastBackupAt: typeof lastBackupAt === 'number' ? lastBackupAt : undefined,
    firstUseAt: typeof firstUseAt === 'number' ? firstUseAt : undefined,
  }
}
