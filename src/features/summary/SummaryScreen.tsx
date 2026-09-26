import { ChevronLeft, ChevronRight, Download, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import {
  useBackupState,
  useCategories,
  useCategoryUsage,
  useMonthBudgets,
  useMonthTransactions,
  useTransactionCount,
} from '../../db/queries'
import type { Category, Transaction } from '../../db/types'
import { isBackupOverdue } from '../../lib/backup-reminder'
import { budgetStatus, summarizeTransactions } from '../../lib/budget'
import { addMonths, currentMonth, daysBetween, type ISOMonth } from '../../lib/dates'
import { formatDaysAgo, formatMoney, formatMonthName, formatMonthTitle, formatPercent } from '../../lib/format'
import { navigate } from '../../lib/router'
import { isStandalone } from '../../lib/share-file'
import { useSelectedMonth, shiftSelectedMonth } from '../../shell/month-store'
import { NavButton, Page } from '../../shell/Page'
import { openSheet } from '../../shell/sheet-store'
import { Button } from '../../ui/Button'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Group, Row } from '../../ui/Group'
import { LogoMark } from '../../ui/LogoMark'
import { ProgressBar } from '../../ui/ProgressBar'
import { TransactionRow } from '../transactions/TransactionRow'
import { MonthFacts } from './MonthFacts'
import { MonthHero } from './MonthHero'
import { QuickLog } from './QuickLog'
import styles from './SummaryScreen.module.css'

const CATEGORY_PREVIEW = 5
const RECENT_COUNT = 5

export function SummaryScreen() {
  const month = useSelectedMonth()
  const transactions = useMonthTransactions(month)
  const previous = useMonthTransactions(addMonths(month, -1))
  const categoryList = useCategories()
  const usage = useCategoryUsage()
  const budgets = useMonthBudgets(month)
  const totalCount = useTransactionCount()
  const backup = useBackupState()
  const [now] = useState(() => new Date())
  const isCurrent = month >= currentMonth(now)
  const today = month === currentMonth(now) ? now.getDate() : null
  const [year] = month.split('-')

  const loading = !transactions || !previous || !categoryList || !usage || !budgets || totalCount === undefined
  const categories = new Map((categoryList ?? []).map((category) => [category.id, category]))

  return (
    <Page
      title={formatMonthName(month)}
      titleAccessory={<span className={styles.year}>{year}</span>}
      compactTitle={formatMonthTitle(month)}
      actions={
        <>
          <NavButton label="Mes anterior" onClick={() => shiftSelectedMonth(-1)}>
            <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
          </NavButton>
          <NavButton label="Mes siguiente" onClick={() => shiftSelectedMonth(1)} disabled={isCurrent}>
            <ChevronRight size={22} strokeWidth={2.2} aria-hidden />
          </NavButton>
        </>
      }
    >
      {!loading && (
        <>
          {!isStandalone() && <InstallHint />}
          {totalCount === 0 ? (
            <>
              <Welcome />
              <QuickLog categories={categoryList} usage={usage} />
            </>
          ) : (
            <>
              <MonthHero
                key={month}
                month={month}
                transactions={transactions}
                previous={previous}
                categories={categories}
                today={today}
              />
              <QuickLog categories={categoryList} usage={usage} />
              {backup && isBackupOverdue(backup.lastBackupAt, backup.firstUseAt) && (
                <BackupReminder lastBackupAt={backup.lastBackupAt} />
              )}
              {transactions.length > 0 && (
                <MonthContent
                  month={month}
                  transactions={transactions}
                  categories={categories}
                  budgets={new Map(budgets.map((budget) => [budget.categoryId, budget.limit]))}
                  today={today}
                />
              )}
            </>
          )}
        </>
      )}
    </Page>
  )
}

interface MonthContentProps {
  month: ISOMonth
  transactions: Transaction[]
  categories: Map<string, Category>
  budgets: Map<string, number>
  today: number | null
}

function MonthContent({ month, transactions, categories, budgets, today }: MonthContentProps) {
  const [showAllCategories, setShowAllCategories] = useState(false)
  const summary = summarizeTransactions(transactions)
  const spending = [...summary.expenseByCategory.entries()].sort((a, b) => b[1] - a[1])
  const visibleSpending = showAllCategories ? spending : spending.slice(0, CATEGORY_PREVIEW)

  return (
    <>
      {spending.length > 0 && (
        <Group title="Gastos por categoría">
          <div className={styles.shareBar} aria-hidden>
            {spending.map(([categoryId, amount]) => (
              <span
                key={categoryId}
                className={styles.shareSegment}
                style={{ flexGrow: amount, backgroundColor: categories.get(categoryId)?.color }}
              />
            ))}
          </div>
          {visibleSpending.map(([categoryId, amount]) => {
            const category = categories.get(categoryId)
            const limit = budgets.get(categoryId)
            const status = limit !== undefined ? budgetStatus(amount, limit) : null
            return (
              <Row
                key={categoryId}
                leading={<CategoryIcon category={category} />}
                title={category?.name ?? 'Sin categoría'}
                trailing={<span className="amount">{formatMoney(amount)}</span>}
                subtitle={
                  status ? (
                    <span className={styles.status} data-state={status.state}>
                      {status.state === 'over'
                        ? `Te pasaste por ${formatMoney(-status.remaining)}`
                        : `Quedan ${formatMoney(status.remaining)} de ${formatMoney(status.limit)}`}
                    </span>
                  ) : (
                    `${formatPercent(amount / summary.expense)} del gasto`
                  )
                }
                detail={
                  status ? (
                    <span className={styles.rowProgress}>
                      <ProgressBar
                        ratio={status.ratio}
                        state={status.state}
                        label={`Presupuesto de ${category?.name ?? 'categoría'}`}
                      />
                    </span>
                  ) : undefined
                }
                onClick={() => openSheet({ type: 'budget', categoryId })}
              />
            )
          })}
          {spending.length > CATEGORY_PREVIEW && (
            <Row
              title={
                <span className={styles.linkText}>
                  {showAllCategories ? 'Ver menos' : `Ver las ${spending.length} categorías`}
                </span>
              }
              onClick={() => setShowAllCategories((value) => !value)}
            />
          )}
        </Group>
      )}

      <MonthFacts month={month} transactions={transactions} categories={categories} today={today} />

      <Group
        title="Últimos movimientos"
        action={
          <Button variant="plain" size="small" onClick={() => navigate('movimientos')}>
            Ver todos
          </Button>
        }
      >
        {transactions.slice(0, RECENT_COUNT).map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            category={categories.get(transaction.categoryId)}
            showDate
            onSelect={(selected) => openSheet({ type: 'transaction', id: selected.id })}
          />
        ))}
      </Group>
    </>
  )
}

function Welcome() {
  return (
    <section className={styles.welcome}>
      <LogoMark className={styles.welcomeMark} />
      <h2 className={styles.welcomeTitle}>Tu plata, solo en este iPhone</h2>
      <p className={styles.welcomeText}>
        Registra tu primer gasto o ingreso con el botón <strong>+</strong>. Sin cuentas ni servidores: nada de lo que
        anotes sale de tu teléfono.
      </p>
      <Button variant="primary" size="large" onClick={() => openSheet({ type: 'transaction' })}>
        Registrar el primero
      </Button>
    </section>
  )
}

function BackupReminder({ lastBackupAt }: { lastBackupAt?: number }) {
  const [now] = useState(() => Date.now())
  const days = lastBackupAt ? daysBetween(lastBackupAt, now) : undefined
  return (
    <Group>
      <Row
        leading={
          <span className={styles.noticeIcon} data-tone="warning">
            <ShieldAlert size={20} strokeWidth={2} aria-hidden />
          </span>
        }
        title="Haz un respaldo"
        subtitle={
          days === undefined ? 'Aún no has guardado ninguno.' : `El último fue ${formatDaysAgo(days)}.`
        }
        trailing={<span className={styles.linkText}>Respaldar</span>}
        onClick={() => openSheet({ type: 'backup-export' })}
      />
    </Group>
  )
}

function InstallHint() {
  return (
    <Group>
      <Row
        leading={
          <span className={styles.noticeIcon}>
            <Download size={20} strokeWidth={2} aria-hidden />
          </span>
        }
        title="Instala Luka en tu inicio"
        subtitle="En Safari: Compartir y luego Agregar a inicio."
      />
    </Group>
  )
}
