import { FileCheck2, FileLock2, FileSpreadsheet, FolderOpen } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { markBackupDone } from '../../db/actions'
import { createSnapshot, db, replaceAllData } from '../../db/database'
import { useTransactionCount } from '../../db/queries'
import { InvalidSnapshotError, validateSnapshot, type DataSnapshot } from '../../db/snapshot'
import {
  InvalidBackupFileError,
  WrongPasswordError,
  decryptBackup,
  encryptBackup,
  parseBackupFile,
  type EncryptedBackupFile,
} from '../../lib/backup-crypto'
import { transactionsToCsv } from '../../lib/csv'
import { todayISO } from '../../lib/dates'
import { formatGrouped, formatLongDate } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { shareOrDownload } from '../../lib/share-file'
import { closeSheet, useSheetRequest } from '../../shell/sheet-store'
import { Button } from '../../ui/Button'
import { Field, FieldGroup, Notice } from '../../ui/Field'
import { Sheet, SheetBody, SheetHeader } from '../../ui/Sheet'
import { toast } from '../../ui/toast-store'
import styles from './BackupSheets.module.css'

const MIN_PASSWORD_LENGTH = 8

function CancelButton({ label = 'Cancelar' }: { label?: string }) {
  return (
    <Button variant="plain" size="medium" onClick={closeSheet}>
      {label}
    </Button>
  )
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatGrouped(count)} ${count === 1 ? singular : pluralForm}`
}

export function BackupExportSheet() {
  const { open, session } = useSheetRequest('backup-export')
  return (
    <Sheet open={open} onClose={closeSheet} label="Exportar respaldo cifrado">
      <BackupExportForm key={session} />
    </Sheet>
  )
}

function BackupExportForm() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'ready'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const mismatch = confirmation.length > 0 && password !== confirmation
  const canCreate = password.length >= MIN_PASSWORD_LENGTH && password === confirmation && status === 'idle'

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!canCreate) return
    setStatus('working')
    setError(null)
    try {
      const snapshot = await createSnapshot()
      const encrypted = await encryptBackup(snapshot, password)
      setPassword('')
      setConfirmation('')
      setFile(
        new File([JSON.stringify(encrypted)], `luka-respaldo-${todayISO()}.json`, {
          type: 'application/json',
        }),
      )
      setStatus('ready')
      haptic()
    } catch {
      setStatus('idle')
      setError('No se pudo crear el respaldo. Inténtalo de nuevo.')
    }
  }

  const save = async () => {
    if (!file) return
    const outcome = await shareOrDownload(file)
    if (outcome === 'cancelled') return
    await markBackupDone()
    closeSheet()
    toast('Respaldo guardado', { tone: 'success', detail: 'Guárdalo en Archivos o iCloud Drive.' })
  }

  if (status === 'ready' && file) {
    return (
      <>
        <SheetHeader leading={<CancelButton label="Cerrar" />} title="Respaldo listo" />
        <SheetBody>
          <div className={styles.fileCard}>
            <FileCheck2 size={40} strokeWidth={1.6} aria-hidden />
            <p className={styles.fileName}>{file.name}</p>
            <p className={styles.fileMeta}>Cifrado con AES-256 · {formatGrouped(Math.ceil(file.size / 1024))} KB</p>
          </div>
          <Notice>
            Elige <strong>Guardar en Archivos</strong> para dejarlo en iCloud Drive o en tu iPhone. Sin la contraseña
            nadie puede abrirlo.
          </Notice>
        </SheetBody>
        <footer className={styles.footer}>
          <Button variant="primary" size="large" block onClick={save}>
            Guardar archivo
          </Button>
        </footer>
      </>
    )
  }

  return (
    <form onSubmit={create} className={styles.form}>
      <SheetHeader leading={<CancelButton />} title="Respaldo cifrado" />
      <SheetBody>
        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <FileLock2 size={28} strokeWidth={1.8} aria-hidden />
          </span>
          <p className={styles.introText}>
            El archivo queda cifrado con la contraseña que elijas. Luka no la guarda en ningún lado: si la olvidas, no
            hay forma de recuperar el respaldo.
          </p>
        </div>
        <FieldGroup
          footer={
            tooShort
              ? `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`
              : mismatch
                ? 'Las contraseñas no coinciden.'
                : 'Una frase de varias palabras es fácil de recordar y difícil de adivinar.'
          }
        >
          <Field
            label="Contraseña"
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            onChange={(event) => setPassword(event.target.value)}
          />
          <Field
            label="Confirmar"
            type="password"
            value={confirmation}
            autoComplete="new-password"
            placeholder="Repítela"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </FieldGroup>
        {error && <Notice tone="danger">{error}</Notice>}
      </SheetBody>
      <footer className={styles.footer}>
        <Button type="submit" variant="primary" size="large" block disabled={!canCreate}>
          {status === 'working' ? 'Cifrando…' : 'Crear respaldo'}
        </Button>
      </footer>
    </form>
  )
}

export function BackupImportSheet() {
  const { open, session } = useSheetRequest('backup-import')
  return (
    <Sheet open={open} onClose={closeSheet} label="Importar respaldo">
      <BackupImportForm key={session} />
    </Sheet>
  )
}

type ImportStep =
  | { step: 'pick' }
  | { step: 'password'; fileName: string; encrypted: EncryptedBackupFile }
  | { step: 'confirm'; snapshot: DataSnapshot }

function BackupImportForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportStep>({ step: 'pick' })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const currentCount = useTransactionCount()

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const encrypted = parseBackupFile(await file.text())
      setState({ step: 'password', fileName: file.name, encrypted })
    } catch (caught) {
      setError(
        caught instanceof InvalidBackupFileError
          ? 'Ese archivo no es un respaldo de Luka o está dañado.'
          : 'No se pudo leer el archivo.',
      )
    }
  }

  const decrypt = async (event: FormEvent) => {
    event.preventDefault()
    if (state.step !== 'password' || password.length === 0) return
    setWorking(true)
    setError(null)
    try {
      const snapshot = validateSnapshot(await decryptBackup(state.encrypted, password))
      setPassword('')
      setState({ step: 'confirm', snapshot })
      haptic()
    } catch (caught) {
      setError(
        caught instanceof WrongPasswordError
          ? 'La contraseña no es correcta.'
          : caught instanceof InvalidSnapshotError || caught instanceof InvalidBackupFileError
            ? 'El respaldo se abrió, pero su contenido no es válido.'
            : 'No se pudo abrir el respaldo.',
      )
    } finally {
      setWorking(false)
    }
  }

  const replace = async () => {
    if (state.step !== 'confirm') return
    setWorking(true)
    try {
      await replaceAllData(state.snapshot)
      haptic()
      closeSheet()
      toast('Datos restaurados', {
        tone: 'success',
        detail: plural(state.snapshot.transactions.length, 'movimiento', 'movimientos'),
      })
    } catch {
      setWorking(false)
      setError('No se pudieron reemplazar los datos. Nada cambió.')
    }
  }

  if (state.step === 'confirm') {
    const { snapshot } = state
    return (
      <>
        <SheetHeader leading={<CancelButton />} title="Revisar respaldo" />
        <SheetBody>
          <div className={styles.fileCard}>
            <FileCheck2 size={40} strokeWidth={1.6} aria-hidden />
            <p className={styles.fileName}>Respaldo del {formatLongDate(Date.parse(snapshot.exportedAt))}</p>
            <p className={styles.fileMeta}>
              {plural(snapshot.transactions.length, 'movimiento', 'movimientos')} ·{' '}
              {plural(snapshot.categories.length, 'categoría', 'categorías')} ·{' '}
              {plural(snapshot.budgets.length, 'presupuesto', 'presupuestos')}
            </p>
          </div>
          <Notice tone="warning">
            Esto <strong>reemplaza todo</strong> lo que hay ahora en este iPhone
            {currentCount ? ` (${plural(currentCount, 'movimiento', 'movimientos')})` : ''}. No se puede deshacer.
          </Notice>
          {error && <Notice tone="danger">{error}</Notice>}
        </SheetBody>
        <footer className={styles.footer}>
          <Button variant="primary" size="large" block disabled={working} onClick={replace}>
            {working ? 'Restaurando…' : 'Reemplazar mis datos'}
          </Button>
        </footer>
      </>
    )
  }

  if (state.step === 'password') {
    return (
      <form onSubmit={decrypt} className={styles.form}>
        <SheetHeader leading={<CancelButton />} title="Importar respaldo" />
        <SheetBody>
          <div className={styles.fileCard}>
            <FileLock2 size={40} strokeWidth={1.6} aria-hidden />
            <p className={styles.fileName}>{state.fileName}</p>
            <p className={styles.fileMeta}>Escribe la contraseña con la que lo creaste.</p>
          </div>
          <FieldGroup>
            <Field
              label="Contraseña"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </FieldGroup>
          {error && <Notice tone="danger">{error}</Notice>}
        </SheetBody>
        <footer className={styles.footer}>
          <Button type="submit" variant="primary" size="large" block disabled={working || password.length === 0}>
            {working ? 'Descifrando…' : 'Abrir respaldo'}
          </Button>
        </footer>
      </form>
    )
  }

  return (
    <>
      <SheetHeader leading={<CancelButton />} title="Importar respaldo" />
      <SheetBody>
        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <FolderOpen size={28} strokeWidth={1.8} aria-hidden />
          </span>
          <p className={styles.introText}>
            Elige un archivo de respaldo de Luka. Antes de cambiar nada te mostraremos qué contiene y te pediremos
            confirmación.
          </p>
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          tabIndex={-1}
          onChange={(event) => {
            void pickFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </SheetBody>
      <footer className={styles.footer}>
        <Button variant="primary" size="large" block onClick={() => inputRef.current?.click()}>
          Elegir archivo
        </Button>
      </footer>
    </>
  )
}

export function CsvExportSheet() {
  const { open, session } = useSheetRequest('csv-export')
  return (
    <Sheet open={open} onClose={closeSheet} label="Exportar CSV">
      <CsvExportForm key={session} />
    </Sheet>
  )
}

function CsvExportForm() {
  const count = useTransactionCount()
  const [working, setWorking] = useState(false)

  const exportCsv = async () => {
    setWorking(true)
    try {
      const [transactions, categories] = await Promise.all([db.transactions.toArray(), db.categories.toArray()])
      const file = new File([transactionsToCsv(transactions, categories)], `luka-movimientos-${todayISO()}.csv`, {
        type: 'text/csv',
      })
      const outcome = await shareOrDownload(file)
      if (outcome !== 'cancelled') {
        closeSheet()
        toast('CSV exportado', { tone: 'success' })
      }
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <SheetHeader leading={<CancelButton />} title="Exportar CSV" />
      <SheetBody>
        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <FileSpreadsheet size={28} strokeWidth={1.8} aria-hidden />
          </span>
          <p className={styles.introText}>
            Un archivo con todos tus movimientos para abrir en Numbers, Excel o Google Sheets.
          </p>
        </div>
        <Notice tone="warning">
          <strong>El CSV no va cifrado.</strong> Cualquiera que tenga el archivo puede leer tus movimientos. Para
          respaldar, usa el respaldo cifrado.
        </Notice>
      </SheetBody>
      <footer className={styles.footer}>
        <Button variant="primary" size="large" block disabled={working || !count} onClick={exportCsv}>
          {count ? `Exportar ${plural(count, 'movimiento', 'movimientos')}` : 'No hay movimientos'}
        </Button>
      </footer>
    </>
  )
}
