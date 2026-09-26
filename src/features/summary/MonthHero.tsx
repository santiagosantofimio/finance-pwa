import { ArrowDownLeft, ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { Category, Transaction } from '../../db/types'
import { summarizeTransactions } from '../../lib/budget'
import { addMonths, type ISOMonth } from '../../lib/dates'
import { formatDayHeading, formatMoney, formatMonthName, formatPercent } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { chartScale, dailyTotals, expenseUntilDay, spendingChange } from '../../lib/insights'
import { LogoMark } from '../../ui/LogoMark'
import styles from './MonthHero.module.css'

interface MonthHeroProps {
  month: ISOMonth
  transactions: Transaction[]
  previous: Transaction[]
  categories: Map<string, Category>
  today: number | null
}

const AXIS_DAYS = [1, 8, 15, 22]

function pad(day: number) {
  return String(day).padStart(2, '0')
}

export function MonthHero({ month, transactions, previous, categories, today }: MonthHeroProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const selectedRef = useRef<number | null>(null)
  const summary = summarizeTransactions(transactions)
  const totals = dailyTotals(transactions, month)
  const days = totals.expense.length
  const lastSelectable = today ?? days
  const scale = chartScale(totals.expense)
  const elapsed = today ?? days
  const average = summary.expense / elapsed
  const previousName = formatMonthName(addMonths(month, -1)).toLocaleLowerCase('es-CO')
  const change = spendingChange(expenseUntilDay(transactions, today), expenseUntilDay(previous, today))

  const select = (index: number | null) => {
    if (selectedRef.current === index) return
    selectedRef.current = index
    if (index !== null) haptic()
    setSelected(index)
  }

  const indexFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const raw = Math.floor(((event.clientX - rect.left) / rect.width) * days)
    return Math.max(0, Math.min(lastSelectable - 1, raw))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const start = selected ?? lastSelectable - 1
    if (event.key === 'ArrowLeft') select(Math.max(0, start - (selected === null ? 0 : 1)))
    else if (event.key === 'ArrowRight') select(Math.min(lastSelectable - 1, start + (selected === null ? 0 : 1)))
    else if (event.key === 'Escape') select(null)
    else return
    event.preventDefault()
  }

  const selectedDate = selected === null ? null : `${month}-${pad(selected + 1)}`
  const dayItems =
    selectedDate === null
      ? []
      : transactions.filter((transaction) => transaction.date === selectedDate && transaction.kind === 'expense')
  const dayIncome = selected === null ? 0 : totals.income[selected]
  const dayLabel =
    dayItems.length === 0
      ? 'Sin gastos este día'
      : [...new Set(dayItems.map((item) => item.note || categories.get(item.categoryId)?.name || 'Gasto'))]
          .slice(0, 2)
          .join(', ') + (dayItems.length > 2 ? ` y ${dayItems.length - 2} más` : '')

  const negative = summary.balance < 0

  return (
    <section className={styles.hero} aria-label="Resumen del mes">
      <LogoMark className={styles.watermark} />
      <div className={styles.header} aria-live="polite">
        <div className={styles.topLine}>
          <span className={styles.label}>
            {selectedDate ? formatDayHeading(selectedDate) : negative ? 'Gastaste de más' : 'Te queda'}
          </span>
          {!selectedDate && (
            <span className={styles.pill}>{today ? `Día ${today} de ${days}` : 'Mes cerrado'}</span>
          )}
        </div>
        <p className={`amount ${styles.balance}`} data-negative={!selectedDate && negative ? 'true' : undefined}>
          {selected === null ? formatMoney(summary.balance) : formatMoney(totals.expense[selected])}
        </p>
        {selected === null ? (
          <div className={styles.flows}>
            <span className={styles.flow}>
              <span className={styles.flowIcon} data-kind="income">
                <ArrowDownLeft size={14} strokeWidth={2.6} aria-hidden />
              </span>
              <span className={styles.flowLabel}>Entró</span>
              <span className="amount" data-kind="income">
                +{formatMoney(summary.income)}
              </span>
            </span>
            <span className={styles.flow}>
              <span className={styles.flowIcon}>
                <ArrowUpRight size={14} strokeWidth={2.6} aria-hidden />
              </span>
              <span className={styles.flowLabel}>Salió</span>
              <span className="amount">{formatMoney(summary.expense)}</span>
            </span>
          </div>
        ) : (
          <p className={styles.dayDetail}>
            <span className={styles.dayItems}>{dayLabel}</span>
            {dayIncome > 0 && (
              <span className="amount" data-kind="income">
                +{formatMoney(dayIncome)}
              </span>
            )}
          </p>
        )}
      </div>

      <div
        className={styles.chart}
        role="slider"
        tabIndex={0}
        aria-label="Gasto por día. Desliza para ver cada día."
        aria-valuemin={1}
        aria-valuemax={lastSelectable}
        aria-valuenow={(selected ?? lastSelectable - 1) + 1}
        aria-valuetext={
          selectedDate ? `${formatDayHeading(selectedDate)}: ${formatMoney(totals.expense[selected ?? 0])}` : 'Todo el mes'
        }
        data-scrubbing={selected !== null ? 'true' : undefined}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          select(indexFromPointer(event))
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) select(indexFromPointer(event))
        }}
        onPointerUp={() => select(null)}
        onPointerCancel={() => select(null)}
        onKeyDown={handleKeyDown}
        onBlur={() => select(null)}
      >
        <div className={styles.plot}>
          {average > 0 && scale.max > 0 && average <= scale.max && (
            <span className={styles.average} style={{ bottom: `${(average / scale.max) * 100}%` }} aria-hidden>
              <span className={styles.averageLabel}>promedio</span>
            </span>
          )}
          {totals.expense.map((value, index) => {
            const day = index + 1
            const future = today !== null && day > today
            const state = future ? 'future' : value === 0 ? 'empty' : 'spent'
            const height = state === 'spent' ? Math.max(5, Math.min(100, (value / scale.max) * 100)) : 0
            return (
              <span
                key={day}
                className={styles.slot}
                data-selected={selected === index ? 'true' : undefined}
                data-today={today === day ? 'true' : undefined}
                aria-hidden
              >
                <span
                  className={styles.bar}
                  data-state={state}
                  data-clipped={scale.clipped[index] ? 'true' : undefined}
                  style={{
                    height: state === 'spent' ? `${height}%` : undefined,
                    ['--index' as string]: index,
                  }}
                />
              </span>
            )
          })}
        </div>
        <div className={styles.axis} aria-hidden>
          {[...AXIS_DAYS, days].map((day) => (
            <span key={day} style={{ left: `${((day - 0.5) / days) * 100}%` }} data-today={today === day ? 'true' : undefined}>
              {day}
            </span>
          ))}
        </div>
      </div>

      <p className={styles.insight}>
        {summary.expense === 0 && summary.income === 0 ? (
          <>
            <Minus size={16} strokeWidth={2.4} aria-hidden />
            <span>Aún no hay movimientos en {formatMonthName(month).toLocaleLowerCase('es-CO')}.</span>
          </>
        ) : change === null ? (
          <>
            <Minus size={16} strokeWidth={2.4} aria-hidden />
            <span>
              Promedio de <strong className="amount">{formatMoney(Math.round(average))}</strong> al día en gastos.
            </span>
          </>
        ) : Math.abs(change) < 0.03 ? (
          <>
            <Minus size={16} strokeWidth={2.4} aria-hidden />
            <span>
              Vas igual que en {previousName}
              {today ? ' a esta altura' : ''}.
            </span>
          </>
        ) : (
          <>
            {change < 0 ? (
              <TrendingDown size={16} strokeWidth={2.4} aria-hidden />
            ) : (
              <TrendingUp size={16} strokeWidth={2.4} aria-hidden />
            )}
            <span>
              {today ? 'Vas ' : 'Gastaste '}
              <strong>
                {formatPercent(Math.abs(change))} {change < 0 ? (today ? 'por debajo' : 'menos') : today ? 'por encima' : 'más'}
              </strong>{' '}
              {today ? `de ${previousName} a esta altura.` : `que en ${previousName}.`}
            </span>
          </>
        )}
      </p>
    </section>
  )
}
