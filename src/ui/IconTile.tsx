import type { LucideIcon } from 'lucide-react'
import styles from './IconTile.module.css'

export function IconTile({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span className={styles.tile} style={{ backgroundColor: color }}>
      <Icon size={18} strokeWidth={2.2} color="#ffffff" aria-hidden />
    </span>
  )
}
