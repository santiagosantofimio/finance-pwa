import { useState } from 'react'
import { setBudget } from '../../db/actions'
import { db } from '../../db/database'
import { useKeyedLiveQuery } from '../../db/queries'
import type { Category } from '../../db/types'
import { addMonths, monthBounds, type ISOMonth } from '../../lib/dates'
import { formatMoney, formatMonthName, formatMonthTitle } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { useSelectedMonth } from '../../shell/month-store'
import { closeSheet, useSheetRequest } from '../../shell/sheet-store'
import { AmountDisplay } from '../../ui/AmountDisplay'
import { Button } from '../../ui/Button'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Keypad } from '../../ui/Keypad'
import { Sheet, SheetBody, SheetHeader } from '../../ui/Sheet'
import { toast } from '../../ui/toast-store'
import styles from './BudgetSheet.module.css'

async function spentIn(categoryId: string, month: ISOMonth): Promise<number> {
  const { start, end } = monthBounds(month)
  let total = 0
  await db.transactions
    .where('date')
    .between(start, end, true, true)
    .filter((transaction) => transaction.kind === 'expense' && transaction.categoryId === categoryId)
    .each((transaction) => {
      total += transaction.amount
    })
  return total
}

export function BudgetSheet() {
  const { open, request, session } = useSheetRequest('budget')
  const [last, setLast] = useState(request)
  if (request && request !== last) setLast(request)
  const current = request ?? last
  const month = useSelectedMonth()
  const data = useKeyedLiveQuery(current ? `${session}:${current.categoryId}:${month}` : null, async () => {
    if (!current) return null
    const [category, budget, spent, previousSpent] = await Promise.all([
      db.categories.get(current.categoryId),
      db.budgets.get([current.categoryId, month]),
      spentIn(current.categoryId, month),
      spentIn(current.categoryId, addMonths(month, -1)),
    ])
    return category ? { category, limit: budget?.limit ?? null, spent, previousSpent } : null
  })

  return (
    <Sheet open={open} onClose={closeSheet} label="Presupuesto">
      {data && (
        <BudgetForm
          key={`${session}-${data.category.id}`}
          category={data.category}
          month={month}
          initialLimit={data.limit}
          spent={data.spent}
          previousSpent={data.previousSpent}
          active={open}
        />
      )}
    </Sheet>
  )
}

interface BudgetFormProps {
  category: Category
  month: ISOMonth
  initialLimit: number | null
  spent: number
  previousSpent: number
  active: boolean
}

function BudgetForm({ category, month, initialLimit, spent, previousSpent, active }: BudgetFormProps) {
  const [limit, setLimit] = useState<number | null>(initialLimit)
  const previousMonthName = formatMonthName(addMonths(month, -1)).toLocaleLowerCase('es-CO')

  const save = async () => {
    if (limit === null || limit <= 0) return
    haptic()
    await setBudget(category.id, month, limit)
    closeSheet()
  }

  const remove = async () => {
    haptic()
    await setBudget(category.id, month, null)
    closeSheet()
    toast(`Quitaste el límite de ${category.name}`, {
      action: { label: 'Deshacer', onAction: () => void setBudget(category.id, month, initialLimit) },
    })
  }

  return (
    <>
      <SheetHeader
        leading={
          <Button variant="plain" size="medium" onClick={closeSheet}>
            Cancelar
          </Button>
        }
        title={formatMonthTitle(month)}
      />
      <SheetBody>
        <div className={styles.heading}>
          <CategoryIcon category={category} size={44} />
          <p className={styles.title}>Límite para {category.name}</p>
          <p className={styles.subtitle}>
            Llevas gastado {formatMoney(spent)} este mes.
          </p>
        </div>
        <div className={styles.amount}>
          <AmountDisplay value={limit} kind="expense" />
        </div>
        {previousSpent > 0 && limit !== previousSpent && (
          <div className={styles.suggestion}>
            <Button variant="secondary" size="small" onClick={() => setLimit(previousSpent)}>
              Usar lo de {previousMonthName}: {formatMoney(previousSpent)}
            </Button>
          </div>
        )}
      </SheetBody>
      <footer className={styles.footer}>
        <Keypad value={limit} onChange={setLimit} captureKeyboard={active} />
        <div className={styles.actions}>
          <Button variant="primary" size="large" block disabled={limit === null || limit <= 0} onClick={save}>
            {initialLimit === null ? 'Definir límite' : 'Guardar límite'}
          </Button>
          {initialLimit !== null && (
            <Button variant="plain" size="medium" onClick={remove} className={styles.remove}>
              Quitar límite
            </Button>
          )}
        </div>
      </footer>
    </>
  )
}
