import type { ReactNode } from 'react'
import styles from './Group.module.css'

interface GroupProps {
  title?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  flush?: boolean
}

export function Group({ title, action, footer, children, flush = false }: GroupProps) {
  return (
    <section className={styles.group}>
      {(title || action) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {action}
        </header>
      )}
      <div className={flush ? `${styles.body} ${styles.flush}` : styles.body}>{children}</div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  )
}

interface RowProps {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  detail?: ReactNode
  onClick?: () => void
  chevron?: boolean
  destructive?: boolean
  ariaLabel?: string
}

export function Row({ leading, title, subtitle, trailing, detail, onClick, chevron, destructive, ariaLabel }: RowProps) {
  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.content}>
        <span className={styles.line}>
          <span className={destructive ? `${styles.rowTitle} ${styles.destructive}` : styles.rowTitle}>{title}</span>
          {trailing !== undefined && <span className={styles.trailing}>{trailing}</span>}
          {chevron && <span className={styles.chevron} aria-hidden />}
        </span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {detail}
      </span>
    </>
  )
  if (onClick) {
    return (
      <button type="button" className={`${styles.row} ${styles.pressable}`} onClick={onClick} aria-label={ariaLabel}>
        {content}
      </button>
    )
  }
  return <div className={styles.row}>{content}</div>
}
