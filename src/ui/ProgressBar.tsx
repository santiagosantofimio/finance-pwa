import type { BudgetState } from '../lib/budget'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  ratio: number
  state?: BudgetState
  color?: string
  label?: string
}

export function ProgressBar({ ratio, state = 'ok', color, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 1))
  return (
    <span
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      data-state={state}
    >
      <span
        className={styles.fill}
        style={{ transform: `scaleX(${clamped})`, ...(color && state === 'ok' ? { backgroundColor: color } : {}) }}
      />
    </span>
  )
}
