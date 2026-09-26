export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator.storage?.persist !== 'function') return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator.storage?.persisted !== 'function') return false
  try {
    return await navigator.storage.persisted()
  } catch {
    return false
  }
}
