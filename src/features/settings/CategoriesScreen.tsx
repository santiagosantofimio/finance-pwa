import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useCategories, useCategoryUsage } from '../../db/queries'
import type { TransactionKind } from '../../db/types'
import { navigate } from '../../lib/router'
import { Page } from '../../shell/Page'
import { openSheet } from '../../shell/sheet-store'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Group, Row } from '../../ui/Group'
import { SegmentedControl } from '../../ui/SegmentedControl'
import styles from './CategoriesScreen.module.css'

const KIND_SEGMENTS: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
]

function usageLabel(count: number): string {
  if (count === 0) return 'Sin movimientos'
  return count === 1 ? '1 movimiento' : `${count} movimientos`
}

export function CategoriesScreen() {
  const categories = useCategories()
  const usage = useCategoryUsage()
  const [kind, setKind] = useState<TransactionKind>('expense')
  const ofKind = (categories ?? []).filter((category) => category.kind === kind)
  const active = ofKind.filter((category) => !category.archived)
  const archived = ofKind.filter((category) => category.archived)

  return (
    <Page
      title="Categorías"
      compactTitle="Categorías"
      back={{ label: 'Ajustes', onBack: () => navigate('ajustes', 'back') }}
    >
      <div className={styles.controls}>
        <SegmentedControl label="Tipo de categoría" value={kind} segments={KIND_SEGMENTS} onChange={setKind} />
      </div>
      {categories && usage && (
        <>
          <Group>
            {active.map((category) => (
              <Row
                key={category.id}
                leading={<CategoryIcon category={category} />}
                title={category.name}
                subtitle={usageLabel(usage.get(category.id) ?? 0)}
                chevron
                onClick={() => openSheet({ type: 'category', id: category.id, kind })}
              />
            ))}
            <Row
              leading={
                <span className={styles.addIcon}>
                  <Plus size={20} strokeWidth={2.4} aria-hidden />
                </span>
              }
              title={<span className={styles.link}>Nueva categoría</span>}
              onClick={() => openSheet({ type: 'category', kind })}
            />
          </Group>
          {archived.length > 0 && (
            <Group title="Archivadas" footer="Las categorías archivadas no aparecen al registrar, pero conservan su historial.">
              {archived.map((category) => (
                <Row
                  key={category.id}
                  leading={<CategoryIcon category={category} />}
                  title={category.name}
                  subtitle={usageLabel(usage.get(category.id) ?? 0)}
                  chevron
                  onClick={() => openSheet({ type: 'category', id: category.id, kind })}
                />
              ))}
            </Group>
          )}
        </>
      )}
    </Page>
  )
}
