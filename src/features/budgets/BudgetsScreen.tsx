import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { copyBudgetsFromPreviousMonth, previousMonthBudgetCount } from '../../db/actions'
import { useCategories, useMonthBudgets, useMonthTransactions } from '../../db/queries'
import { budgetStatus, summarizeTransactions } from '../../lib/budget'
import { addMonths, currentMonth, parseISODate, type ISOMonth } from '../../lib/dates'
import { formatMoney, formatMonthName, formatMonthTitle } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { NavButton, Page } from '../../shell/Page'
import { shiftSelectedMonth, useSelectedMonth } from '../../shell/month-store'
import { openSheet } from '../../shell/sheet-store'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Group, Row } from '../../ui/Group'
import { ProgressBar } from '../../ui/ProgressBar'
import { toast } from '../../ui/toast-store'
import styles from './BudgetsScreen.module.css'

function daysLeftInMonth(month: ISOMonth, now: Date = new Date()): number | null {
  if (month !== currentMonth(now)) return null
  const end = parseISODate(`${month}-01`)
  end.setMonth(end.getMonth() + 1)
  end.setDate(0)
  return end.getDate() - now.getDate() + 1
}

export function BudgetsScreen() {
  const month = useSelectedMonth()
  const categories = useCategories()
  const budgets = useMonthBudgets(month)
  const transactions = useMonthTransactions(month)
  const previousCount = useLiveQuery(() => previousMonthBudgetCount(month), [month])
  const isCurrent = month >= currentMonth()

  const ready = categories && budgets && transactions

  return (
    <Page
      title="Presupuestos"
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
      <p className={styles.month}>{formatMonthTitle(month)}</p>
      {ready && (
        <BudgetsContent
          month={month}
          categories={categories.filter((category) => category.kind === 'expense')}
          budgets={new Map(budgets.map((budget) => [budget.categoryId, budget.limit]))}
          spent={summarizeTransactions(transactions).expenseByCategory}
          previousCount={previousCount ?? 0}
        />
      )}
    </Page>
  )
}

interface BudgetsContentProps {
  month: ISOMonth
  categories: NonNullable<ReturnType<typeof useCategories>>
  budgets: Map<string, number>
  spent: Map<string, number>
  previousCount: number
}

function BudgetsContent({ month, categories, budgets, spent, previousCount }: BudgetsContentProps) {
  const withBudget = categories.filter((category) => budgets.has(category.id))
  const withoutBudget = categories.filter((category) => !budgets.has(category.id) && !category.archived)
  const totalLimit = withBudget.reduce((total, category) => total + (budgets.get(category.id) ?? 0), 0)
  const totalSpent = withBudget.reduce((total, category) => total + (spent.get(category.id) ?? 0), 0)
  const overall = budgetStatus(totalSpent, totalLimit)
  const daysLeft = daysLeftInMonth(month)
  const previousMonthName = formatMonthName(addMonths(month, -1)).toLocaleLowerCase('es-CO')

  const copyPrevious = async () => {
    haptic()
    const copied = await copyBudgetsFromPreviousMonth(month)
    toast(copied === 1 ? 'Se copió 1 presupuesto' : `Se copiaron ${copied} presupuestos`, { tone: 'success' })
  }

  return (
    <>
      {withBudget.length > 0 ? (
        <Group>
          <div className={styles.overview}>
            <p className={styles.overviewLine}>
              Llevas <span className="amount">{formatMoney(totalSpent)}</span> de{' '}
              <span className="amount">{formatMoney(totalLimit)}</span>
            </p>
            <ProgressBar ratio={overall.ratio} state={overall.state} label="Avance del presupuesto total" />
            <p className={styles.overviewNote} data-state={overall.state}>
              {overall.state === 'over'
                ? `Vas ${formatMoney(-overall.remaining)} por encima de lo que planeaste.`
                : daysLeft
                  ? `Quedan ${formatMoney(overall.remaining)}, unos ${formatMoney(Math.floor(overall.remaining / daysLeft))} por día durante ${daysLeft === 1 ? 'el último día' : `${daysLeft} días`}.`
                  : `Quedaron ${formatMoney(overall.remaining)} sin gastar.`}
            </p>
          </div>
        </Group>
      ) : (
        <section className={styles.intro}>
          <p className={styles.introTitle}>Ponle un límite a cada categoría</p>
          <p className={styles.introText}>
            Toca una categoría para definir cuánto quieres gastar este mes. Te avisaremos al llegar al 80 % y si te
            pasas.
          </p>
        </section>
      )}

      {withBudget.length === 0 && previousCount > 0 && (
        <Group>
          <Row
            leading={
              <span className={styles.copyIcon}>
                <Copy size={18} strokeWidth={2.2} aria-hidden />
              </span>
            }
            title={<span className={styles.link}>Copiar los de {previousMonthName}</span>}
            subtitle={previousCount === 1 ? '1 presupuesto' : `${previousCount} presupuestos`}
            onClick={copyPrevious}
          />
        </Group>
      )}

      {withBudget.length > 0 && (
        <Group title="Con límite">
          {withBudget.map((category) => {
            const status = budgetStatus(spent.get(category.id) ?? 0, budgets.get(category.id) ?? 0)
            return (
              <Row
                key={category.id}
                leading={<CategoryIcon category={category} />}
                title={category.name}
                trailing={
                  <span className={styles.spent} data-state={status.state}>
                    {formatMoney(status.spent)}
                  </span>
                }
                subtitle={
                  <span className={styles.status} data-state={status.state}>
                    {status.state === 'over'
                      ? `Te pasaste por ${formatMoney(-status.remaining)}`
                      : `Quedan ${formatMoney(status.remaining)} de ${formatMoney(status.limit)}`}
                  </span>
                }
                detail={
                  <span className={styles.rowProgress}>
                    <ProgressBar
                      ratio={status.ratio}
                      state={status.state}
                      label={`Presupuesto de ${category.name}`}
                    />
                  </span>
                }
                onClick={() => openSheet({ type: 'budget', categoryId: category.id })}
              />
            )
          })}
        </Group>
      )}

      {withoutBudget.length > 0 && (
        <Group title="Sin límite" footer="Las categorías sin límite no cuentan en el total de arriba.">
          {withoutBudget.map((category) => {
            const amount = spent.get(category.id) ?? 0
            return (
              <Row
                key={category.id}
                leading={<CategoryIcon category={category} />}
                title={category.name}
                subtitle={amount > 0 ? `Gastado: ${formatMoney(amount)}` : 'Sin gastos este mes'}
                trailing={<span className={styles.link}>Definir</span>}
                onClick={() => openSheet({ type: 'budget', categoryId: category.id })}
              />
            )
          })}
        </Group>
      )}
    </>
  )
}
