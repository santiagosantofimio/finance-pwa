const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const groupedNumberFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

export const MAX_AMOUNT = 999_999_999_999

export function formatCOP(amount: number): string {
  return copFormatter.format(amount)
}

export function formatAmountInput(amount: number | null): string {
  return amount === null ? '' : groupedNumberFormatter.format(amount)
}

export function parseAmountInput(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (digits === '') return null
  const amount = Number(digits.replace(/^0+(?=\d)/, ''))
  if (!Number.isSafeInteger(amount) || amount > MAX_AMOUNT) return null
  return amount
}

export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT
}
