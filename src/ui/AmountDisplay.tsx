import { formatGrouped } from '../lib/format'
import styles from './AmountDisplay.module.css'

interface AmountDisplayProps {
  value: number | null
  kind: 'income' | 'expense'
}

export function AmountDisplay({ value, kind }: AmountDisplayProps) {
  const digits = formatGrouped(value ?? 0)
  const size = digits.length > 13 ? 'small' : digits.length > 9 ? 'medium' : 'large'
  return (
    <output className={styles.display} data-empty={value === null ? 'true' : undefined} data-size={size} data-kind={kind}>
      <span className={styles.sign} aria-hidden>
        {kind === 'income' ? '+' : ''}$
      </span>
      <span className={styles.digits}>{digits}</span>
    </output>
  )
}
