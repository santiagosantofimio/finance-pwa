import { useSyncExternalStore } from 'react'
import type { TransactionKind } from '../db/types'

export type SheetRequest =
  | { type: 'transaction'; id?: string; kind?: TransactionKind }
  | { type: 'budget'; categoryId: string }
  | { type: 'category'; id?: string; kind: TransactionKind }
  | { type: 'backup-export' }
  | { type: 'backup-import' }
  | { type: 'csv-export' }

export interface SheetState {
  request: SheetRequest | null
  session: number
}

let state: SheetState = { request: null, session: 0 }
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function openSheet(request: SheetRequest) {
  state = { request, session: state.session + 1 }
  emit()
}

export function closeSheet() {
  if (!state.request) return
  state = { ...state, request: null }
  emit()
}

export function useSheetState(): SheetState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
}

export function useSheetRequest<T extends SheetRequest['type']>(type: T) {
  const { request, session } = useSheetState()
  const active = request?.type === type ? (request as Extract<SheetRequest, { type: T }>) : null
  return { open: active !== null, request: active, session }
}
