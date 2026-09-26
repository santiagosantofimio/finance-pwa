import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES } from './default-categories'
import { InvalidSnapshotError, SNAPSHOT_SCHEMA_VERSION, validateSnapshot } from './snapshot'

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: '2026-09-26T12:00:00.000Z',
    categories: [...DEFAULT_CATEGORIES],
    transactions: [
      {
        id: 't1',
        kind: 'expense',
        amount: 25_000,
        categoryId: 'dining',
        date: '2026-09-20',
        paymentMethod: 'credit',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    budgets: [{ categoryId: 'dining', month: '2026-09', limit: 300_000 }],
    settings: [{ key: 'theme', value: 'system' }],
    ...overrides,
  }
}

describe('validateSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(validateSnapshot(snapshot()).transactions).toHaveLength(1)
  })

  it('rejects unknown schema versions', () => {
    expect(() => validateSnapshot(snapshot({ schemaVersion: 99 }))).toThrow(InvalidSnapshotError)
  })

  it('rejects fractional amounts and invalid dates', () => {
    const [valid] = snapshot().transactions
    expect(() => validateSnapshot(snapshot({ transactions: [{ ...valid, amount: 10.5 }] }))).toThrow(
      InvalidSnapshotError,
    )
    expect(() => validateSnapshot(snapshot({ transactions: [{ ...valid, date: '2026-02-30' }] }))).toThrow(
      InvalidSnapshotError,
    )
  })

  it('rejects references to missing categories', () => {
    expect(() => validateSnapshot(snapshot({ budgets: [{ categoryId: 'ghost', month: '2026-09', limit: 1 }] }))).toThrow(
      InvalidSnapshotError,
    )
  })

  it('rejects duplicate ids', () => {
    const [valid] = snapshot().transactions
    expect(() => validateSnapshot(snapshot({ transactions: [valid, valid] }))).toThrow(InvalidSnapshotError)
  })
})
