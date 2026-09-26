import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { BudgetSheet } from './features/budgets/BudgetSheet'
import { BudgetsScreen } from './features/budgets/BudgetsScreen'
import { BackupExportSheet, BackupImportSheet, CsvExportSheet } from './features/settings/BackupSheets'
import { CategoriesScreen } from './features/settings/CategoriesScreen'
import { CategorySheet } from './features/settings/CategorySheet'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { SummaryScreen } from './features/summary/SummaryScreen'
import { HistoryScreen } from './features/transactions/HistoryScreen'
import { TransactionSheet } from './features/transactions/TransactionSheet'
import { useRoute, type Route } from './lib/router'
import { TabBar } from './shell/TabBar'
import { Toaster } from './ui/Toaster'
import { toast } from './ui/toast-store'

function Screen({ route }: { route: Route }) {
  switch (route.tab) {
    case 'movimientos':
      return <HistoryScreen />
    case 'presupuestos':
      return <BudgetsScreen />
    case 'ajustes':
      return route.path[0] === 'categorias' ? <CategoriesScreen /> : <SettingsScreen />
    default:
      return <SummaryScreen />
  }
}

function useUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toast('Hay una versión nueva', {
      detail: 'Tus datos se quedan igual.',
      duration: Infinity,
      action: { label: 'Actualizar', onAction: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker])
}

export function App() {
  const route = useRoute()
  useUpdatePrompt()

  return (
    <>
      <main key={`${route.tab}/${route.path.join('/')}`}>
        <Screen route={route} />
      </main>
      <TabBar active={route.tab} />
      <TransactionSheet />
      <BudgetSheet />
      <CategorySheet />
      <BackupExportSheet />
      <BackupImportSheet />
      <CsvExportSheet />
      <Toaster />
    </>
  )
}
