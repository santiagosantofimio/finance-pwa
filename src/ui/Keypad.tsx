import { Delete } from 'lucide-react'
import { useEffect } from 'react'
import { MAX_AMOUNT } from '../lib/money'
import styles from './Keypad.module.css'

interface KeypadProps {
  value: number | null
  onChange: (value: number | null) => void
  captureKeyboard?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'delete'] as const

type Key = (typeof KEYS)[number]

function applyKey(value: number | null, key: Key): number | null {
  const current = value ?? 0
  if (key === 'delete') {
    const next = Math.floor(current / 10)
    return next === 0 ? null : next
  }
  const multiplier = key === '000' ? 1000 : 10
  const digit = key === '000' ? 0 : Number(key)
  if (current === 0 && digit === 0) return value
  const next = current * multiplier + digit
  return next > MAX_AMOUNT ? value : next
}

export function Keypad({ value, onChange, captureKeyboard = false }: KeypadProps) {
  useEffect(() => {
    if (!captureKeyboard) return
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select') || event.metaKey || event.ctrlKey || event.altKey) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        onChange(applyKey(value, event.key as Key))
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        onChange(applyKey(value, 'delete'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [captureKeyboard, onChange, value])

  return (
    <div className={styles.keypad} role="group" aria-label="Teclado numérico">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={styles.key}
          data-key={key}
          aria-label={key === 'delete' ? 'Borrar' : key === '000' ? 'Tres ceros' : key}
          onClick={() => onChange(applyKey(value, key))}
        >
          {key === 'delete' ? <Delete size={24} strokeWidth={1.9} aria-hidden /> : key}
        </button>
      ))}
    </div>
  )
}
