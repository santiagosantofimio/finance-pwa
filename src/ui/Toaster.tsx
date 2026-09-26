import { CircleAlert, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dismissToast, pauseToast, resumeToast, useToast, type ToastItem } from './toast-store'
import styles from './Toaster.module.css'

export function Toaster() {
  const active = useToast()
  const [lastShown, setLastShown] = useState<ToastItem | null>(null)
  if (active && active !== lastShown) setLastShown(active)
  const leaving = !active && lastShown !== null

  useEffect(() => {
    if (!leaving) return
    const timeout = window.setTimeout(() => setLastShown(null), 260)
    return () => window.clearTimeout(timeout)
  }, [leaving])

  const item = active ?? lastShown

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {item && (
        <div
          key={item.id}
          className={styles.toast}
          data-tone={item.tone}
          data-leaving={leaving ? 'true' : undefined}
          onPointerEnter={pauseToast}
          onPointerLeave={resumeToast}
        >
          {item.tone === 'warning' || item.tone === 'danger' ? (
            <CircleAlert className={styles.icon} size={20} strokeWidth={2.2} aria-hidden />
          ) : item.tone === 'success' ? (
            <Check className={styles.icon} size={20} strokeWidth={2.4} aria-hidden />
          ) : null}
          <span className={styles.text}>
            <span className={styles.message}>{item.message}</span>
            {item.detail && <span className={styles.detail}>{item.detail}</span>}
          </span>
          {item.action && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                item.action?.onAction()
                dismissToast(item.id)
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
