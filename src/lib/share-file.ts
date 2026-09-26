export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

export async function shareOrDownload(file: File): Promise<ShareOutcome> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}

export function isStandalone(): boolean {
  const legacyStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return legacyStandalone === true || window.matchMedia('(display-mode: standalone)').matches
}
