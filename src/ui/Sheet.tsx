import { useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  size?: 'large' | 'auto'
}

const DISMISS_VELOCITY = 0.45
const DISMISS_FRACTION = 0.28

interface DragState {
  pointerId: number
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  offset: number
  active: boolean
}

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export function Sheet({ open, onClose, label, children, size = 'auto' }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      delete dialog.dataset.state
      dialog.showModal()
      panelRef.current?.focus({ preventScroll: true })
      return
    }
    if (!open && dialog.open && dialog.dataset.state !== 'closing') {
      dialog.dataset.state = 'closing'
      const panel = panelRef.current
      const finish = () => {
        if (dialog.dataset.state === 'closing') {
          dialog.close()
          delete dialog.dataset.state
        }
      }
      if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish()
        return
      }
      const timeout = window.setTimeout(finish, 450)
      panel.addEventListener(
        'transitionend',
        () => {
          window.clearTimeout(timeout)
          finish()
        },
        { once: true },
      )
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    const viewport = window.visualViewport
    if (!dialog || !viewport || !open) return
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      dialog.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      dialog.style.removeProperty('--keyboard-inset')
    }
  }, [open])

  const requestClose = () => onCloseRef.current()

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!target.closest('[data-sheet-drag]') || target.closest('button, input, select, textarea, a')) return
    if (dragRef.current || !event.isPrimary) return
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      offset: 0,
      active: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const panel = panelRef.current
    if (!drag || !panel || event.pointerId !== drag.pointerId) return
    const delta = event.clientY - drag.startY
    if (!drag.active) {
      if (Math.abs(delta) < 8) return
      drag.active = true
      panel.setPointerCapture(event.pointerId)
      panel.dataset.dragging = 'true'
    }
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime)
    drag.velocity = (event.clientY - drag.lastY) / elapsed
    drag.lastY = event.clientY
    drag.lastTime = event.timeStamp
    drag.offset = delta >= 0 ? delta : rubberband(delta, panel.offsetHeight)
    panel.style.transform = `translate3d(0, ${drag.offset}px, 0)`
    dialogRef.current?.style.setProperty('--drag-progress', String(Math.max(0, delta) / panel.offsetHeight))
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const panel = panelRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    if (!panel || !drag.active) return
    delete panel.dataset.dragging
    dialogRef.current?.style.removeProperty('--drag-progress')
    const shouldDismiss =
      drag.offset > 0 && (drag.velocity > DISMISS_VELOCITY || drag.offset > panel.offsetHeight * DISMISS_FRACTION)
    panel.style.transform = ''
    if (shouldDismiss) requestClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={label}
      data-size={size}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.grabber} data-sheet-drag aria-hidden />
        {children}
      </div>
    </dialog>
  )
}

interface SheetHeaderProps {
  title: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
}

export function SheetHeader({ title, leading, trailing }: SheetHeaderProps) {
  return (
    <header className={styles.header} data-sheet-drag>
      <span className={styles.headerSide}>{leading}</span>
      <h2 className={styles.headerTitle}>{title}</h2>
      <span className={`${styles.headerSide} ${styles.headerTrailing}`}>{trailing}</span>
    </header>
  )
}

export function SheetBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>
}
