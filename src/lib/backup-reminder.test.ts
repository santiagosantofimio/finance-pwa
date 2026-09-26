import { describe, expect, it } from 'vitest'
import { isBackupOverdue } from './backup-reminder'

const day = 24 * 60 * 60 * 1000
const now = new Date(2026, 8, 26).getTime()

describe('isBackupOverdue', () => {
  it('does not remind before any data exists', () => {
    expect(isBackupOverdue(undefined, undefined, now)).toBe(false)
  })

  it('reminds after more than two weeks since the last backup', () => {
    expect(isBackupOverdue(now - 14 * day, undefined, now)).toBe(false)
    expect(isBackupOverdue(now - 15 * day, undefined, now)).toBe(true)
  })

  it('falls back to the first use date when there was never a backup', () => {
    expect(isBackupOverdue(undefined, now - 3 * day, now)).toBe(false)
    expect(isBackupOverdue(undefined, now - 20 * day, now)).toBe(true)
  })
})
