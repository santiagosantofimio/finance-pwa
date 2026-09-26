import { ChartPie, List, Plus, Settings, Target, type LucideIcon } from 'lucide-react'
import { navigate, type Tab } from '../lib/router'
import { openSheet } from './sheet-store'
import styles from './TabBar.module.css'

const ITEMS: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: 'resumen', label: 'Resumen', icon: ChartPie },
  { tab: 'movimientos', label: 'Movimientos', icon: List },
  { tab: 'presupuestos', label: 'Presupuestos', icon: Target },
  { tab: 'ajustes', label: 'Ajustes', icon: Settings },
]

export function TabBar({ active }: { active: Tab }) {
  return (
    <div className={styles.dock}>
      <nav className={styles.bar} aria-label="Secciones">
        {ITEMS.map(({ tab, label, icon: Icon }) => (
          <a
            key={tab}
            href={`#/${tab}`}
            className={styles.item}
            aria-current={tab === active ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              if (tab === active) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
              }
              navigate(tab)
            }}
          >
            <Icon size={23} strokeWidth={tab === active ? 2.2 : 1.8} aria-hidden />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <button
        type="button"
        className={styles.add}
        aria-label="Registrar movimiento"
        onClick={() => openSheet({ type: 'transaction' })}
      >
        <Plus size={28} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  )
}
