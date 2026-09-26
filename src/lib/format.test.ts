import { describe, expect, it } from 'vitest'
import { formatDayHeading, formatDayShort, formatMoney, formatSignedMoney, normalizeSearch } from './format'

const nbsp = ' '

describe('formatMoney', () => {
  it('groups thousands with dots and uses a real minus sign', () => {
    expect(formatMoney(2_806_000)).toBe(`$${nbsp}2.806.000`)
    expect(formatMoney(-11_800)).toBe(`−$${nbsp}11.800`)
    expect(formatMoney(0)).toBe(`$${nbsp}0`)
  })

  it('prefixes income with a plus sign and leaves expenses unsigned', () => {
    expect(formatSignedMoney(850_000, 'income')).toBe(`+$${nbsp}850.000`)
    expect(formatSignedMoney(9_800, 'expense')).toBe(`$${nbsp}9.800`)
  })
})

describe('day labels', () => {
  const today = '2026-09-26'

  it('names today and yesterday', () => {
    expect(formatDayHeading('2026-09-26', today)).toBe('Hoy')
    expect(formatDayHeading('2026-09-25', today)).toBe('Ayer')
    expect(formatDayShort('2026-09-25', today)).toBe('Ayer')
  })

  it('handles yesterday across a month boundary', () => {
    expect(formatDayHeading('2026-08-31', '2026-09-01')).toBe('Ayer')
  })

  it('capitalizes older headings and adds the year only when it differs', () => {
    expect(formatDayHeading('2026-09-20', today)).toMatch(/^Domingo, 20 de septiembre$/)
    expect(formatDayHeading('2025-12-31', today)).toMatch(/2025/)
  })
})

describe('normalizeSearch', () => {
  it('ignores accents and case', () => {
    expect(normalizeSearch('  Éxito CAFÉ ')).toBe('exito cafe')
  })
})
