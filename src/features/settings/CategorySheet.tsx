import { createElement, useState } from 'react'
import { deleteCategoryIfUnused, saveCategory, setCategoryArchived } from '../../db/actions'
import { db } from '../../db/database'
import { useKeyedLiveQuery } from '../../db/queries'
import type { Category, TransactionKind } from '../../db/types'
import { haptic } from '../../lib/haptics'
import { closeSheet, useSheetRequest } from '../../shell/sheet-store'
import { Button } from '../../ui/Button'
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_LABELS,
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_LABELS,
  iconFor,
} from '../../ui/category-icons'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Sheet, SheetBody, SheetHeader } from '../../ui/Sheet'
import { toast } from '../../ui/toast-store'
import styles from './CategorySheet.module.css'

export function CategorySheet() {
  const { open, request, session } = useSheetRequest('category')
  const [last, setLast] = useState(request)
  if (request && request !== last) setLast(request)
  const current = request ?? last
  const data = useKeyedLiveQuery(current ? `${session}:${current.id ?? 'new'}` : null, async () => {
    if (!current) return null
    if (!current.id) return { category: undefined, usage: 0 }
    const [category, usage] = await Promise.all([
      db.categories.get(current.id),
      db.transactions.where('categoryId').equals(current.id).count(),
    ])
    return { category, usage }
  })

  return (
    <Sheet open={open} onClose={closeSheet} label={current?.id ? 'Editar categoría' : 'Nueva categoría'} size="large">
      {current && data && (
        <CategoryForm
          key={`${session}-${current.id ?? 'new'}`}
          kind={current.kind}
          existing={data.category}
          usage={data.usage}
        />
      )}
    </Sheet>
  )
}

interface CategoryFormProps {
  kind: TransactionKind
  existing?: Category
  usage: number
}

function CategoryForm({ kind, existing: loaded, usage }: CategoryFormProps) {
  const [existing] = useState(loaded)
  const [name, setName] = useState(existing?.name ?? '')
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[3])
  const [icon, setIcon] = useState(existing?.icon ?? (kind === 'expense' ? 'shopping-bag' : 'banknote'))
  const canSave = name.trim().length > 0

  const save = async () => {
    if (!canSave) return
    haptic()
    await saveCategory({ kind: existing?.kind ?? kind, name, color, icon }, existing?.id)
    closeSheet()
  }

  const toggleArchive = async () => {
    if (!existing) return
    haptic()
    await setCategoryArchived(existing.id, !existing.archived)
    closeSheet()
    toast(existing.archived ? `${existing.name} vuelve a estar activa` : `${existing.name} quedó archivada`, {
      action: existing.archived
        ? undefined
        : { label: 'Deshacer', onAction: () => void setCategoryArchived(existing.id, false) },
    })
  }

  const remove = async () => {
    if (!existing) return
    haptic()
    const deleted = await deleteCategoryIfUnused(existing.id)
    closeSheet()
    toast(deleted ? `Eliminaste ${existing.name}` : 'No se pudo eliminar', {
      tone: deleted ? 'neutral' : 'warning',
      detail: deleted ? undefined : 'Tiene movimientos; puedes archivarla.',
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
        title={existing ? 'Editar categoría' : kind === 'expense' ? 'Categoría de gasto' : 'Categoría de ingreso'}
        trailing={
          <Button variant="plain" size="medium" disabled={!canSave} onClick={save} className={styles.save}>
            Guardar
          </Button>
        }
      />
      <SheetBody>
        <div className={styles.preview}>
          <CategoryIcon category={{ color, icon }} size={72} />
          <input
            className={styles.name}
            type="text"
            value={name}
            maxLength={28}
            placeholder="Nombre"
            aria-label="Nombre de la categoría"
            autoComplete="off"
            enterKeyHint="done"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </div>

        <section className={styles.section} aria-label="Color">
          <div className={styles.colors} role="radiogroup" aria-label="Color">
            {CATEGORY_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={value === color}
                aria-label={CATEGORY_COLOR_LABELS[value] ?? value}
                className={styles.color}
                style={{ backgroundColor: value, ['--swatch' as string]: value }}
                onClick={() => setColor(value)}
              />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-label="Ícono">
          <div className={styles.icons} role="radiogroup" aria-label="Ícono">
            {CATEGORY_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={key === icon}
                  aria-label={CATEGORY_ICON_LABELS[key] ?? key}
                  className={styles.icon}
                  style={{ ['--swatch' as string]: color }}
                  onClick={() => setIcon(key)}
                >
                  {createElement(iconFor(key), { size: 22, strokeWidth: 2, 'aria-hidden': true })}
                </button>
            ))}
          </div>
        </section>

        {existing && (
          <div className={styles.dangerZone}>
            <Button variant="secondary" block onClick={toggleArchive}>
              {existing.archived ? 'Restaurar categoría' : 'Archivar categoría'}
            </Button>
            {usage === 0 ? (
              <Button variant="destructive" block onClick={remove}>
                Eliminar categoría
              </Button>
            ) : (
              <p className={styles.hint}>
                Tiene {usage === 1 ? '1 movimiento' : `${usage} movimientos`}. Archívala para ocultarla sin perder el
                historial.
              </p>
            )}
          </div>
        )}
      </SheetBody>
    </>
  )
}
