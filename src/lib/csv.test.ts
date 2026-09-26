import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../db/types'
import { escapeCsvCell, transactionsToCsv } from './csv'

const categories: Category[] = [
  { id: 'groceries', kind: 'expense', name: 'Mercado', color: '#000', icon: 'x', order: 0, builtIn: true, archived: false },
  { id: 'salary', kind: 'income', name: 'Salario', color: '#000', icon: 'x', order: 0, builtIn: true, archived: false },
]

const base = { paymentMethod: 'nequi', createdAt: 0, updatedAt: 0 } as const

describe('escapeCsvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"')
  })

  it('neutralizes spreadsheet formulas in text', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(escapeCsvCell('+57')).toBe("'+57")
    expect(escapeCsvCell('@sum')).toBe("'@sum")
  })

  it('leaves numbers untouched', () => {
    expect(escapeCsvCell(-12_000)).toBe('-12000')
  })
})

describe('transactionsToCsv', () => {
  it('writes a BOM, a Spanish header and signed amounts sorted by date', () => {
    const transactions: Transaction[] = [
      { ...base, id: '2', kind: 'expense', amount: 45_000, categoryId: 'groceries', date: '2026-09-10', note: 'D1, Éxito' },
      { ...base, id: '1', kind: 'income', amount: 3_000_000, categoryId: 'salary', date: '2026-09-01' },
    ]
    const csv = transactionsToCsv(transactions, categories)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Fecha,Tipo,Categoría,Monto,Medio de pago,Nota',
      '2026-09-01,Ingreso,Salario,3000000,Nequi,',
      '2026-09-10,Gasto,Mercado,-45000,Nequi,"D1, Éxito"',
      '',
    ])
  })
})
