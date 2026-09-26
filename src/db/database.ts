import Dexie, { type EntityTable, type Table } from 'dexie'
import { DEFAULT_CATEGORIES } from './default-categories'
import { SNAPSHOT_SCHEMA_VERSION, type DataSnapshot } from './snapshot'
import type { Budget, Category, Setting, Transaction } from './types'

export const SETTING_KEYS = {
  lastBackupAt: 'lastBackupAt',
  firstUseAt: 'firstUseAt',
} as const

const deviceOnlySettingKeys: readonly string[] = [SETTING_KEYS.lastBackupAt, SETTING_KEYS.firstUseAt]

export const db = new Dexie('finance-pwa') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>
  categories: EntityTable<Category, 'id'>
  budgets: Table<Budget, [string, string]>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  transactions: 'id, date, categoryId, kind, [kind+date]',
  categories: 'id, kind, order',
  budgets: '[categoryId+month], month, categoryId',
  settings: 'key',
})

db.on('populate', async (transaction) => {
  await transaction.table('categories').bulkAdd([...DEFAULT_CATEGORIES])
})

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await db.settings.get(key)
  return setting?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function createSnapshot(now: Date = new Date()): Promise<DataSnapshot> {
  return db.transaction('r', [db.transactions, db.categories, db.budgets, db.settings], async () => {
    const [transactions, categories, budgets, settings] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.settings.toArray(),
    ])
    return {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      transactions,
      categories,
      budgets,
      settings: settings.filter((setting) => !deviceOnlySettingKeys.includes(setting.key)),
    }
  })
}

export async function replaceAllData(snapshot: DataSnapshot): Promise<void> {
  await db.transaction('rw', [db.transactions, db.categories, db.budgets, db.settings], async () => {
    const deviceSettings = await db.settings.where('key').anyOf([...deviceOnlySettingKeys]).toArray()
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.budgets.clear(), db.settings.clear()])
    await Promise.all([
      db.categories.bulkAdd(snapshot.categories),
      db.transactions.bulkAdd(snapshot.transactions),
      db.budgets.bulkAdd(snapshot.budgets),
      db.settings.bulkPut([
        ...snapshot.settings.filter((setting) => !deviceOnlySettingKeys.includes(setting.key)),
        ...deviceSettings,
      ]),
    ])
  })
}
