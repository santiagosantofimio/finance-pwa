import { ChevronDown, Search, X } from 'lucide-react'
import { useDeferredValue, useState, type ReactNode } from 'react'
import { PAYMENT_METHOD_LABELS } from '../../db/labels'
import { useAllTransactions, useCategories } from '../../db/queries'
import type { Category, Transaction, TransactionKind } from '../../db/types'
import { monthOf, type ISOMonth } from '../../lib/dates'
import { formatDayHeading, formatGrouped, formatMoney, formatMonthTitle, normalizeSearch } from '../../lib/format'
import { Page } from '../../shell/Page'
import { openSheet } from '../../shell/sheet-store'
import { Button } from '../../ui/Button'
import { Group } from '../../ui/Group'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { TransactionRow } from './TransactionRow'
import styles from './HistoryScreen.module.css'

type KindFilter = 'all' | TransactionKind

const KIND_SEGMENTS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
]

const PAGE_SIZE = 150

function searchableText(transaction: Transaction, category?: Category): string {
  return normalizeSearch(
    [
      transaction.note ?? '',
      category?.name ?? '',
      PAYMENT_METHOD_LABELS[transaction.paymentMethod],
      String(transaction.amount),
      formatGrouped(transaction.amount),
    ].join(' '),
  )
}

export function HistoryScreen() {
  const transactions = useAllTransactions()
  const categories = useCategories()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [month, setMonth] = useState<ISOMonth | 'all'>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)

  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category]))
  const months = [...new Set((transactions ?? []).map((transaction) => monthOf(transaction.date)))]
  const terms = normalizeSearch(deferredQuery).split(/\s+/).filter(Boolean)
  const filtersActive = kind !== 'all' || month !== 'all' || categoryId !== 'all' || terms.length > 0

  const filtered = (transactions ?? []).filter((transaction) => {
    if (kind !== 'all' && transaction.kind !== kind) return false
    if (month !== 'all' && monthOf(transaction.date) !== month) return false
    if (categoryId !== 'all' && transaction.categoryId !== categoryId) return false
    if (terms.length === 0) return true
    const text = searchableText(transaction, categoryMap.get(transaction.categoryId))
    return terms.every((term) => text.includes(term))
  })

  const visible = filtered.slice(0, limit)
  const days: { date: string; items: Transaction[] }[] = []
  for (const transaction of visible) {
    const last = days.at(-1)
    if (last && last.date === transaction.date) last.items.push(transaction)
    else days.push({ date: transaction.date, items: [transaction] })
  }
  const net = filtered.reduce(
    (total, transaction) => total + (transaction.kind === 'income' ? transaction.amount : -transaction.amount),
    0,
  )

  const clearFilters = () => {
    setQuery('')
    setKind('all')
    setMonth('all')
    setCategoryId('all')
  }

  const categoryOptions = (categories ?? []).filter((category) => kind === 'all' || category.kind === kind)
  const selectedCategory = categoryId === 'all' ? undefined : categoryMap.get(categoryId)

  return (
    <Page title="Movimientos" compactTitle="Movimientos">
      <div className={styles.controls}>
        <label className={styles.search}>
          <Search size={18} strokeWidth={2.2} aria-hidden />
          <input
            type="search"
            value={query}
            placeholder="Buscar nota, categoría o monto"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Buscar movimientos"
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE_SIZE)
            }}
          />
          {query && (
            <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Borrar búsqueda">
              <X size={14} strokeWidth={3} aria-hidden />
            </button>
          )}
        </label>
        <SegmentedControl
          label="Tipo"
          value={kind}
          segments={KIND_SEGMENTS}
          onChange={(value) => {
            setKind(value)
            if (selectedCategory && value !== 'all' && selectedCategory.kind !== value) setCategoryId('all')
          }}
        />
        <div className={styles.chips}>
          <FilterChip active={month !== 'all'} label={month === 'all' ? 'Todos los meses' : formatMonthTitle(month)}>
            <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Mes">
              <option value="all">Todos los meses</option>
              {months.map((value) => (
                <option key={value} value={value}>
                  {formatMonthTitle(value)}
                </option>
              ))}
            </select>
          </FilterChip>
          <FilterChip active={categoryId !== 'all'} label={selectedCategory?.name ?? 'Todas las categorías'}>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Categoría">
              <option value="all">Todas las categorías</option>
              {(['expense', 'income'] as const).map((group) => {
                const options = categoryOptions.filter((category) => category.kind === group)
                if (options.length === 0) return null
                return (
                  <optgroup key={group} label={group === 'expense' ? 'Gastos' : 'Ingresos'}>
                    {options.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {category.archived ? ' (archivada)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </FilterChip>
        </div>
        {filtersActive && transactions && (
          <p className={styles.summary}>
            <span>
              {filtered.length === 1 ? '1 movimiento' : `${filtered.length} movimientos`}
              {filtered.length > 0 && (
                <>
                  {' · '}
                  <span className="amount" data-kind={net > 0 ? 'income' : undefined}>
                    {net > 0 ? '+' : ''}
                    {formatMoney(net)}
                  </span>
                </>
              )}
            </span>
            <Button variant="plain" size="small" onClick={clearFilters}>
              Quitar filtros
            </Button>
          </p>
        )}
      </div>

      {transactions && categories && (
        <>
          {transactions.length === 0 ? (
            <section className={styles.empty}>
              <p className={styles.emptyTitle}>Aún no hay movimientos</p>
              <p className={styles.emptyText}>Todo lo que registres aparecerá aquí, ordenado por día.</p>
              <Button variant="secondary" onClick={() => openSheet({ type: 'transaction' })}>
                Registrar movimiento
              </Button>
            </section>
          ) : filtered.length === 0 ? (
            <section className={styles.empty}>
              <p className={styles.emptyTitle}>Sin resultados</p>
              <p className={styles.emptyText}>Prueba con otra palabra o quita los filtros.</p>
              <Button variant="secondary" onClick={clearFilters}>
                Quitar filtros
              </Button>
            </section>
          ) : (
            <>
              {days.map((day) => {
                const dayNet = day.items.reduce(
                  (total, transaction) =>
                    total + (transaction.kind === 'income' ? transaction.amount : -transaction.amount),
                  0,
                )
                return (
                  <Group
                    key={day.date}
                    title={<span className={styles.dayTitle}>{formatDayHeading(day.date)}</span>}
                    action={
                      <span className={`amount ${styles.dayTotal}`} data-kind={dayNet > 0 ? 'income' : undefined}>
                        {dayNet > 0 ? '+' : ''}
                        {formatMoney(dayNet)}
                      </span>
                    }
                  >
                    {day.items.map((transaction) => (
                      <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        category={categoryMap.get(transaction.categoryId)}
                        onSelect={(selected) => openSheet({ type: 'transaction', id: selected.id })}
                      />
                    ))}
                  </Group>
                )
              })}
              {filtered.length > limit && (
                <div className={styles.more}>
                  <Button variant="secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                    Mostrar más
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Page>
  )
}

function FilterChip({ active, label, children }: { active: boolean; label: string; children: ReactNode }) {
  return (
    <label className={styles.chip} data-active={active ? 'true' : undefined}>
      <span>{label}</span>
      <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
      {children}
    </label>
  )
}
