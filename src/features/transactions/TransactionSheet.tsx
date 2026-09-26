import { Calendar, CreditCard, StickyNote, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  LAST_PAYMENT_METHOD_KEY,
  budgetImpact,
  deleteTransaction,
  restoreTransaction,
  saveTransaction,
} from '../../db/actions'
import { PAYMENT_METHOD_LABELS } from '../../db/labels'
import { db } from '../../db/database'
import { useCategories, useKeyedLiveQuery, useSettings, useTransactionCount } from '../../db/queries'
import { PAYMENT_METHODS, type Category, type PaymentMethod, type Transaction, type TransactionKind } from '../../db/types'
import { budgetStatus } from '../../lib/budget'
import { monthOf, todayISO } from '../../lib/dates'
import { formatDayShort, formatMoney, formatPercent } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { closeSheet, useSheetRequest } from '../../shell/sheet-store'
import { AmountDisplay } from '../../ui/AmountDisplay'
import { Button } from '../../ui/Button'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Keypad } from '../../ui/Keypad'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Sheet, SheetBody, SheetHeader } from '../../ui/Sheet'
import { toast } from '../../ui/toast-store'
import styles from './TransactionSheet.module.css'

const KIND_SEGMENTS: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
]

export function TransactionSheet() {
  const { open, request, session } = useSheetRequest('transaction')
  const [last, setLast] = useState(request)
  if (request && request !== last) setLast(request)
  const current = request ?? last
  const existing = useKeyedLiveQuery(current ? `${session}:${current.id ?? 'new'}` : null, async () =>
    current?.id ? ((await db.transactions.get(current.id)) ?? null) : null,
  )
  const categories = useCategories()
  const settings = useSettings()
  const count = useTransactionCount()

  const ready = categories !== undefined && settings !== undefined && existing !== undefined
  const lastPayment = settings?.get(LAST_PAYMENT_METHOD_KEY)
  const defaultPayment: PaymentMethod = (PAYMENT_METHODS as readonly unknown[]).includes(lastPayment)
    ? (lastPayment as PaymentMethod)
    : 'debit'

  return (
    <Sheet open={open} onClose={closeSheet} label={current?.id ? 'Editar movimiento' : 'Nuevo movimiento'} size="large">
      {ready && current && (
        <TransactionForm
          key={`${session}-${current.id ?? 'new'}`}
          existing={existing ?? undefined}
          initialKind={current.kind ?? 'expense'}
          categories={categories}
          defaultPayment={defaultPayment}
          isFirst={count === 0}
          active={open}
        />
      )}
    </Sheet>
  )
}

interface TransactionFormProps {
  existing?: Transaction
  initialKind: TransactionKind
  categories: Category[]
  defaultPayment: PaymentMethod
  isFirst: boolean
  active: boolean
}

function TransactionForm({ existing: loaded, initialKind, categories, defaultPayment, isFirst, active }: TransactionFormProps) {
  const [existing] = useState(loaded)
  const [kind, setKind] = useState<TransactionKind>(existing?.kind ?? initialKind)
  const [amount, setAmount] = useState<number | null>(existing?.amount ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null)
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? defaultPayment)
  const [note, setNote] = useState(existing?.note ?? '')
  const [noteFocused, setNoteFocused] = useState(false)
  const [saving, setSaving] = useState(false)

  const visibleCategories = categories.filter(
    (category) => category.kind === kind && (!category.archived || category.id === categoryId),
  )
  const selectedCategory = categories.find((category) => category.id === categoryId && category.kind === kind)
  const canSave = amount !== null && amount > 0 && selectedCategory !== undefined && !saving

  useEffect(() => {
    if (!categoryId) return
    const selected = document.querySelector<HTMLElement>(`[data-category-id="${CSS.escape(categoryId)}"]`)
    selected?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [categoryId, kind])

  const changeKind = (next: TransactionKind) => {
    setKind(next)
    if (selectedCategory && selectedCategory.kind !== next) setCategoryId(null)
  }

  const save = async () => {
    if (!canSave || amount === null || !selectedCategory) return
    setSaving(true)
    haptic()
    try {
      await saveTransaction({ kind, amount, categoryId: selectedCategory.id, date, paymentMethod, note }, existing?.id)
      closeSheet()
      if (kind === 'expense') {
        const impact = await budgetImpact(selectedCategory.id, monthOf(date))
        if (impact) {
          const status = budgetStatus(impact.spent, impact.limit)
          if (status.state === 'over') {
            toast(`Te pasaste en ${selectedCategory.name}`, {
              tone: 'danger',
              detail: `${formatMoney(impact.spent)} de ${formatMoney(impact.limit)} este mes`,
            })
            return
          }
          if (status.state === 'warning') {
            toast(`${selectedCategory.name}: ${formatPercent(status.ratio)} del presupuesto`, {
              tone: 'warning',
              detail: `Quedan ${formatMoney(status.remaining)}`,
            })
            return
          }
        }
      }
      if (isFirst && !existing) {
        toast('Primer movimiento guardado', { tone: 'success', detail: 'Se guarda solo en este iPhone.' })
      }
    } catch {
      setSaving(false)
      toast('No se pudo guardar', { tone: 'danger', detail: 'Inténtalo de nuevo.' })
    }
  }

  const remove = async () => {
    if (!existing) return
    haptic()
    const removed = await deleteTransaction(existing.id)
    closeSheet()
    if (removed) {
      toast('Movimiento eliminado', {
        action: { label: 'Deshacer', onAction: () => void restoreTransaction(removed) },
      })
    }
  }

  const saveLabel = existing ? 'Guardar cambios' : kind === 'expense' ? 'Guardar gasto' : 'Guardar ingreso'

  return (
    <>
      <SheetHeader
        leading={
          <Button variant="plain" size="medium" onClick={closeSheet}>
            Cancelar
          </Button>
        }
        title={
          <SegmentedControl label="Tipo de movimiento" value={kind} segments={KIND_SEGMENTS} onChange={changeKind} />
        }
        trailing={
          existing ? (
            <button type="button" className={styles.iconButton} onClick={remove} aria-label="Eliminar movimiento">
              <Trash2 size={21} strokeWidth={2} aria-hidden />
            </button>
          ) : null
        }
      />
      <SheetBody>
        <div className={styles.body}>
        <div className={styles.amountArea} data-compact={noteFocused ? 'true' : undefined}>
          <AmountDisplay value={amount} kind={kind} />
          <p className={styles.amountHint}>
            {selectedCategory ? (
              <>
                en <strong>{selectedCategory.name}</strong>
              </>
            ) : (
              'Elige una categoría'
            )}
          </p>
        </div>

        <div className={styles.categories} role="radiogroup" aria-label="Categoría">
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={category.id === categoryId}
              data-category-id={category.id}
              className={styles.category}
              style={{ ['--category-color' as string]: category.color }}
              onClick={() => setCategoryId(category.id)}
            >
              <span className={styles.categoryIcon}>
                <CategoryIcon category={category} size={46} />
              </span>
              <span className={styles.categoryName}>{category.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.details}>
          <label className={styles.pill}>
            <Calendar size={18} strokeWidth={2} aria-hidden />
            <span>{formatDayShort(date)}</span>
            <input
              type="date"
              className={styles.overlayInput}
              value={date}
              required
              aria-label="Fecha"
              onChange={(event) => {
                if (event.target.value) setDate(event.target.value)
              }}
            />
          </label>
          <label className={styles.pill}>
            <CreditCard size={18} strokeWidth={2} aria-hidden />
            <span>{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
            <select
              className={styles.overlayInput}
              value={paymentMethod}
              aria-label="Medio de pago"
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.note}>
          <StickyNote size={18} strokeWidth={2} aria-hidden />
          <input
            type="text"
            value={note}
            maxLength={120}
            placeholder="Nota (opcional)"
            enterKeyHint="done"
            autoComplete="off"
            onFocus={() => setNoteFocused(true)}
            onBlur={() => setNoteFocused(false)}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        </div>
      </SheetBody>

      <footer className={styles.footer}>
        {!noteFocused && <Keypad value={amount} onChange={setAmount} captureKeyboard={active} />}
        <div className={styles.saveRow}>
          <Button variant="primary" size="large" block disabled={!canSave} onClick={save}>
            {saveLabel}
          </Button>
        </div>
      </footer>
    </>
  )
}
