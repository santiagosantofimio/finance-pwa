import { describe, expect, it } from 'vitest'
import {
  addMonths,
  daysBetween,
  formatShortDate,
  isISODate,
  isISOMonth,
  monthBounds,
  monthOf,
  parseISODate,
  todayISO,
} from './dates'

describe('local dates', () => {
  it('uses the local calendar day late at night', () => {
    expect(todayISO(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31')
  })

  it('parses YYYY-MM-DD as a local date, not UTC', () => {
    const date = parseISODate('2026-03-01')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 2, 1])
  })

  it('formats the stored day without shifting it', () => {
    expect(formatShortDate('2026-03-01')).toMatch(/^1 /)
  })
})

describe('validation', () => {
  it('accepts real dates only', () => {
    expect(isISODate('2024-02-29')).toBe(true)
    expect(isISODate('2025-02-29')).toBe(false)
    expect(isISODate('2025-13-01')).toBe(false)
    expect(isISODate('2025-1-01')).toBe(false)
  })

  it('accepts real months only', () => {
    expect(isISOMonth('2026-12')).toBe(true)
    expect(isISOMonth('2026-00')).toBe(false)
    expect(isISOMonth('2026-13')).toBe(false)
  })
})

describe('months', () => {
  it('extracts the month of a date', () => {
    expect(monthOf('2026-09-26')).toBe('2026-09')
  })

  it('adds months across years', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('returns inclusive month bounds including leap years', () => {
    expect(monthBounds('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthBounds('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })
})

describe('daysBetween', () => {
  it('counts whole days', () => {
    const start = new Date(2026, 0, 1).getTime()
    expect(daysBetween(start, new Date(2026, 0, 15).getTime())).toBe(14)
  })
})
