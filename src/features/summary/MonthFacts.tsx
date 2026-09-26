import { CalendarClock, CreditCard, ReceiptText, Wallet, type LucideIcon } from 'lucide-react'
import { PAYMENT_METHOD_LABELS } from '../../db/labels'
import type { Category, Transaction } from '../../db/types'
import { summarizeTransactions } from '../../lib/budget'
import { formatDayShort, formatMoney, formatPercent } from '../../lib/format'
import { dailyAllowance, daysInMonth, mostExpensiveDay, topPaymentMethod } from '../../lib/insights'
import type { ISOMonth } from '../../lib/dates'
import styles from './MonthFacts.module.css'

interface MonthFactsProps {
  month: ISOMonth
  transactions: Transaction[]
  categories: Map<string, Category>
  today: number | null
}

interface Fact {
  icon: LucideIcon
  title: string
  value: string
  detail: string
  amount?: boolean
}

export function MonthFacts({ month, transactions, categories, today }: MonthFactsProps) {
  const summary = summarizeTransactions(transactions)
  const days = daysInMonth(month)
  const expensive = mostExpensiveDay(transactions)
  const payment = topPaymentMethod(transactions)
  const expenseCount = transactions.filter((transaction) => transaction.kind === 'expense').length
  const incomeCount = transactions.length - expenseCount

  const facts: Fact[] = []
  if (today) {
    const daysLeft = days - today + 1
    facts.push({
      icon: Wallet,
      title: 'Te alcanza para',
      value: formatMoney(dailyAllowance(summary.balance, daysLeft)),
      detail:
        summary.balance > 0
          ? `por día, durante ${daysLeft === 1 ? 'hoy' : `${daysLeft} días`}`
          : 'ya gastaste lo que entró',
      amount: true,
    })
  } else {
    facts.push({
      icon: Wallet,
      title: 'Promedio diario',
      value: formatMoney(Math.round(summary.expense / days)),
      detail: 'en gastos ese mes',
      amount: true,
    })
  }
  if (expensive) {
    facts.push({
      icon: CalendarClock,
      title: 'Día más caro',
      value: formatMoney(expensive.amount),
      detail: `${formatDayShort(expensive.date)}, ${categories.get(expensive.categoryId)?.name ?? 'varios'}`,
      amount: true,
    })
  }
  if (payment) {
    facts.push({
      icon: CreditCard,
      title: 'Medio más usado',
      value: PAYMENT_METHOD_LABELS[payment.method],
      detail: `${formatPercent(payment.share)} de lo gastado`,
    })
  }
  facts.push({
    icon: ReceiptText,
    title: 'Movimientos',
    value: String(transactions.length),
    detail: `${expenseCount} ${expenseCount === 1 ? 'gasto' : 'gastos'} y ${incomeCount} ${incomeCount === 1 ? 'ingreso' : 'ingresos'}`,
    amount: true,
  })

  return (
    <section className={styles.facts} aria-labelledby="month-facts-title">
      <h2 id="month-facts-title" className={styles.title}>
        Datos del mes
      </h2>
      <div className={styles.grid} data-count={facts.length}>
        {facts.map(({ icon: Icon, title, value, detail, amount }) => (
          <div key={title} className={styles.cell}>
            <span className={styles.cellTitle}>
              <Icon size={15} strokeWidth={2.3} aria-hidden />
              {title}
            </span>
            <span className={amount ? `amount ${styles.value}` : styles.value}>{value}</span>
            <span className={styles.detail}>{detail}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
