import { useRegisterSW } from 'virtual:pwa-register/react'

export function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <main>
      <h1>Luka Wallet</h1>
      {needRefresh && (
        <button type="button" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </button>
      )}
    </main>
  )
}
