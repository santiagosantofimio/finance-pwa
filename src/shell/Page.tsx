import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Page.module.css'

interface PageProps {
  title: ReactNode
  titleAccessory?: ReactNode
  compactTitle: string
  actions?: ReactNode
  back?: { label: string; onBack: () => void }
  children: ReactNode
}

export function Page({ title, titleAccessory, compactTitle, actions, back, children }: PageProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: '-60px 0px 0px 0px',
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.bar} data-scrolled={scrolled ? 'true' : undefined}>
        <div className={styles.barSide}>
          {back && (
            <button type="button" className={styles.back} onClick={back.onBack}>
              <ChevronLeft size={26} strokeWidth={2.2} aria-hidden />
              <span>{back.label}</span>
            </button>
          )}
        </div>
        <p className={styles.compactTitle} aria-hidden={!scrolled}>
          {compactTitle}
        </p>
        <div className={`${styles.barSide} ${styles.barActions}`}>{actions}</div>
      </div>
      <header className={styles.largeTitle}>
        <h1>{title}</h1>
        {titleAccessory}
      </header>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
      <div className={styles.content}>{children}</div>
    </div>
  )
}

interface NavButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}

export function NavButton({ label, onClick, children, disabled }: NavButtonProps) {
  return (
    <button type="button" className={styles.navButton} onClick={onClick} aria-label={label} disabled={disabled}>
      {children}
    </button>
  )
}
