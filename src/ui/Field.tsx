import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Field.module.css'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Field({ label, ...rest }: FieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input className={styles.input} {...rest} />
    </label>
  )
}

export function FieldGroup({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.group}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'warning' | 'danger'; children: ReactNode }) {
  return (
    <p className={styles.notice} data-tone={tone}>
      {children}
    </p>
  )
}
