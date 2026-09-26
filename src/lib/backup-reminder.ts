import { daysBetween } from './dates'

export const BACKUP_REMINDER_DAYS = 14

export function isBackupOverdue(
  lastBackupAt: number | undefined,
  firstUseAt: number | undefined,
  now: number = Date.now(),
): boolean {
  const reference = lastBackupAt ?? firstUseAt
  if (reference === undefined) return false
  return daysBetween(reference, now) > BACKUP_REMINDER_DAYS
}
