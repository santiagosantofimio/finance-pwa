import { useSyncExternalStore } from 'react'

export type ToastTone = 'neutral' | 'warning' | 'danger' | 'success'

export interface ToastAction {
  label: string
  onAction: () => void
}

export interface ToastItem {
  id: number
  message: string
  detail?: string
  tone: ToastTone
  action?: ToastAction
  duration: number
}

interface ToastOptions {
  detail?: string
  tone?: ToastTone
  action?: ToastAction
  duration?: number
}

let current: ToastItem | null = null
let nextId = 1
let timer: number | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function schedule(item: ToastItem) {
  window.clearTimeout(timer)
  if (Number.isFinite(item.duration)) {
    timer = window.setTimeout(() => dismissToast(item.id), item.duration)
  }
}

export function toast(message: string, options: ToastOptions = {}): number {
  const item: ToastItem = {
    id: nextId++,
    message,
    detail: options.detail,
    tone: options.tone ?? 'neutral',
    action: options.action,
    duration: options.duration ?? (options.action ? 5000 : 3200),
  }
  current = item
  emit()
  schedule(item)
  return item.id
}

export function dismissToast(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return
  window.clearTimeout(timer)
  current = null
  emit()
}

export function pauseToast() {
  window.clearTimeout(timer)
}

export function resumeToast() {
  if (current) schedule(current)
}

export function useToast(): ToastItem | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => current,
  )
}
