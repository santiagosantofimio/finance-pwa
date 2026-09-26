import type { Category } from '../../db/types'
import { openSheet } from '../../shell/sheet-store'
import { CategoryIcon } from '../../ui/CategoryIcon'
import styles from './QuickLog.module.css'

interface QuickLogProps {
  categories: Category[]
  usage: Map<string, number>
}

function rank(categories: Category[], usage: Map<string, number>, kind: Category['kind']) {
  return categories
    .filter((category) => category.kind === kind && !category.archived)
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order)
}

export function QuickLog({ categories, usage }: QuickLogProps) {
  const shortcuts = [...rank(categories, usage, 'expense').slice(0, 5), ...rank(categories, usage, 'income').slice(0, 1)]
  if (shortcuts.length === 0) return null
  return (
    <section className={styles.quick} aria-labelledby="quick-log-title">
      <h2 id="quick-log-title" className={styles.title}>
        Registro rápido
      </h2>
      <div className={styles.row}>
        {shortcuts.map((category) => (
          <button
            key={category.id}
            type="button"
            className={styles.chip}
            data-kind={category.kind}
            onClick={() => openSheet({ type: 'transaction', kind: category.kind, categoryId: category.id })}
          >
            <CategoryIcon category={category} size={30} shape="circle" />
            <span className={styles.name}>{category.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
