import { useSyncExternalStore } from 'react'
import { addMonths, currentMonth, type ISOMonth } from '../lib/dates'

let selectedMonth: ISOMonth = currentMonth()
const listeners = new Set<() => void>()

export function setSelectedMonth(month: ISOMonth) {
  if (month === selectedMonth) return
  selectedMonth = month
  for (const listener of listeners) listener()
}

export function shiftSelectedMonth(delta: number) {
  setSelectedMonth(addMonths(selectedMonth, delta))
}

export function useSelectedMonth(): ISOMonth {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => selectedMonth,
  )
}
