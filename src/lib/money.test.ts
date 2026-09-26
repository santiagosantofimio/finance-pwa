import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT, formatAmountInput, formatCOP, isValidAmount, parseAmountInput } from './money'

const normalizeSpaces = (text: string) => text.replace(/\s/g, ' ')

describe('formatCOP', () => {
  it('formats pesos without decimals and with dot grouping', () => {
    expect(normalizeSpaces(formatCOP(1_234_567))).toBe('$ 1.234.567')
  })

  it('formats zero and negative amounts', () => {
    expect(normalizeSpaces(formatCOP(0))).toBe('$ 0')
    expect(normalizeSpaces(formatCOP(-45_000))).toBe('-$ 45.000')
  })
})

describe('parseAmountInput', () => {
  it('reads digits and ignores grouping and currency symbols', () => {
    expect(parseAmountInput('$ 12.500')).toBe(12_500)
    expect(parseAmountInput('1,000,000')).toBe(1_000_000)
    expect(parseAmountInput('007')).toBe(7)
  })

  it('returns null for empty or oversized input', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('abc')).toBeNull()
    expect(parseAmountInput(String(MAX_AMOUNT + 1))).toBeNull()
  })

  it('round-trips with formatAmountInput', () => {
    expect(parseAmountInput(formatAmountInput(98_765))).toBe(98_765)
    expect(formatAmountInput(null)).toBe('')
  })
})

describe('isValidAmount', () => {
  it('accepts only positive safe integers', () => {
    expect(isValidAmount(1)).toBe(true)
    expect(isValidAmount(0)).toBe(false)
    expect(isValidAmount(-5)).toBe(false)
    expect(isValidAmount(10.5)).toBe(false)
    expect(isValidAmount('100')).toBe(false)
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false)
  })
})
