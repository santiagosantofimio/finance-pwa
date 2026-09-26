import { ChevronLeft, ChevronRight, Download, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import {
  useBackupState,
  useCategoryMap,
  useMonthBudgets,
  useMonthTransactions,
  useTransactionCount,
} from '../../db/queries'
import type { Category, Transaction } from '../../db/types'
import { isBackupOverdue } from '../../lib/backup-reminder'
import { budgetStatus, summarizeTransactions } from '../../lib/budget'
import { currentMonth, daysBetween } from '../../lib/dates'
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
import styles from './SummaryScreen.module.css'

const CATEGORY_PREVIEW = 6
const RECENT_COUNT = 5

export function SummaryScreen() {
  const month = useSelectedMonth()
  const transactions = useMonthTransactions(month)
  const categories = useCategoryMap()
  const budgets = useMonthBudgets(month)
  const totalCount = useTransactionCount()
  const backup = useBackupState()
  const isCurrent = month >= currentMonth()
  const [year] = month.split('-')

  const loading = !transactions || !categories || !budgets || totalCount === undefined

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
          {backup && totalCount > 0 && isBackupOverdue(backup.lastBackupAt, backup.firstUseAt) && (
            <BackupReminder lastBackupAt={backup.lastBackupAt} />
          )}
          {totalCount === 0 ? (
            <Welcome />
          ) : transactions.length === 0 ? (
            <EmptyMonth monthLabel={formatMonthName(month).toLocaleLowerCase('es-CO')} />
          ) : (
            <MonthContent
              transactions={transactions}
              categories={categories}
              budgets={new Map(budgets.map((budget) => [budget.categoryId, budget.limit]))}
            />
          )}
        </>
      )}
    </Page>
  )
}

interface MonthContentProps {
  transactions: Transaction[]
  categories: Map<string, Category>
  budgets: Map<string, number>
}

function MonthContent({ transactions, categories, budgets }: MonthContentProps) {
  const [showAllCategories, setShowAllCategories] = useState(false)
  const summary = summarizeTransactions(transactions)
  const spending = [...summary.expenseByCategory.entries()].sort((a, b) => b[1] - a[1])
  const visibleSpending = showAllCategories ? spending : spending.slice(0, CATEGORY_PREVIEW)
  const spentRatio = summary.income > 0 ? summary.expense / summary.income : summary.expense > 0 ? Infinity : 0

  return (
    <>
      <Group>
        <div className={styles.ledger}>
          <div className={styles.ledgerLine}>
            <span>Ingresos</span>
            <span className="amount" data-kind="income">
              +{formatMoney(summary.income)}
            </span>
          </div>
          <div className={styles.ledgerLine}>
            <span>Gastos</span>
            <span className="amount">{formatMoney(summary.expense)}</span>
          </div>
          <div className={styles.ledgerTotal}>
            <span className={styles.ledgerTotalLabel}>{summary.balance < 0 ? 'Gastaste de más' : 'Te queda'}</span>
            <span className={`amount ${styles.balance}`} data-negative={summary.balance < 0 ? 'true' : undefined}>
              {formatMoney(summary.balance)}
            </span>
          </div>
          <div className={styles.flow}>
            <ProgressBar
              ratio={spentRatio}
              state={spentRatio > 1 ? 'over' : spentRatio >= 0.9 ? 'warning' : 'ok'}
              label="Parte de los ingresos que ya se gastó"
            />
            <p className={styles.flowText}>
              {summary.income === 0
                ? 'Aún no registras ingresos este mes.'
                : spentRatio > 1
                  ? `Gastaste ${formatMoney(summary.expense - summary.income)} más de lo que entró.`
                  : `Llevas gastado el ${formatPercent(spentRatio)} de lo que entró.`}
            </p>
          </div>
        </div>
      </Group>

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
                  status
                    ? status.state === 'over'
                      ? `Te pasaste por ${formatMoney(-status.remaining)}`
                      : `Quedan ${formatMoney(status.remaining)} de ${formatMoney(status.limit)}`
                    : `${formatPercent(amount / summary.expense)} del gasto`
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

function EmptyMonth({ monthLabel }: { monthLabel: string }) {
  return (
    <section className={styles.empty}>
      <p className={styles.emptyTitle}>Sin movimientos en {monthLabel}</p>
      <p className={styles.emptyText}>Lo que registres con fecha de este mes aparecerá aquí.</p>
      <Button variant="secondary" onClick={() => openSheet({ type: 'transaction' })}>
        Registrar movimiento
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
