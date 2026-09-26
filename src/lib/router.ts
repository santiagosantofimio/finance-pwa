import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export const TABS = ['resumen', 'movimientos', 'presupuestos', 'ajustes'] as const

export type Tab = (typeof TABS)[number]

export interface Route {
  tab: Tab
  path: string[]
}

export type NavDirection = 'forward' | 'back'

function parseRoute(hash: string): Route {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first, ...rest] = segments
  const tab = (TABS as readonly string[]).includes(first) ? (first as Tab) : 'resumen'
  return { tab, path: tab === first ? rest : [] }
}

let currentRoute = parseRoute(window.location.hash)
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyRoute(next: Route, direction?: NavDirection) {
  const commit = () => {
    currentRoute = next
    flushSync(emit)
    window.scrollTo(0, 0)
  }
  if (direction && typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
    document.documentElement.dataset.navDirection = direction
    const transition = document.startViewTransition(commit)
    transition.finished.finally(() => {
      delete document.documentElement.dataset.navDirection
    })
    return
  }
  commit()
}

export function navigate(target: string, direction?: NavDirection) {
  const hash = target.startsWith('#') ? target : `#/${target}`
  if (hash === window.location.hash) return
  window.history.replaceState(null, '', hash)
  applyRoute(parseRoute(hash), direction)
}

window.addEventListener('hashchange', () => {
  applyRoute(parseRoute(window.location.hash))
})

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => currentRoute)
}
