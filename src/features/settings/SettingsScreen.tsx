import { useLiveQuery } from 'dexie-react-hooks'
import { FileSpreadsheet, HardDrive, Lock, ShieldCheck, Tags, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBackupState, useTransactionCount } from '../../db/queries'
import { db } from '../../db/database'
import { daysBetween } from '../../lib/dates'
import { formatDaysAgo, formatGrouped } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { navigate } from '../../lib/router'
import { isStoragePersisted, requestPersistentStorage } from '../../lib/storage'
import { Page } from '../../shell/Page'
import { openSheet } from '../../shell/sheet-store'
import { Group, Row } from '../../ui/Group'
import { IconTile } from '../../ui/IconTile'
import { LogoMark } from '../../ui/LogoMark'
import { toast } from '../../ui/toast-store'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const backup = useBackupState()
  const transactionCount = useTransactionCount()
  const categoryCount = useLiveQuery(() => db.categories.filter((category) => !category.archived).count(), [])
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    void isStoragePersisted().then((value) => {
      if (!cancelled) setPersisted(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const protectStorage = async () => {
    haptic()
    const granted = await requestPersistentStorage()
    setPersisted(granted)
    toast(granted ? 'Almacenamiento protegido' : 'iOS no lo concedió por ahora', {
      tone: granted ? 'success' : 'warning',
      detail: granted
        ? 'El sistema no borrará tus datos para liberar espacio.'
        : 'Suele concederse con la app instalada en tu inicio.',
    })
  }

  const lastBackup =
    backup?.lastBackupAt === undefined
      ? 'Aún no has hecho ninguno'
      : `Último: ${formatDaysAgo(daysBetween(backup.lastBackupAt, now))}`

  return (
    <Page title="Ajustes" compactTitle="Ajustes">
      <Group
        title="Tus datos"
        footer="Luka no tiene servidores. Si borras la app, tus datos se van con ella: guarda el respaldo en Archivos o iCloud Drive."
      >
        <Row
          leading={<IconTile icon={ShieldCheck} color="#0f3d2e" />}
          title="Exportar respaldo cifrado"
          subtitle={lastBackup}
          chevron
          onClick={() => openSheet({ type: 'backup-export' })}
        />
        <Row
          leading={<IconTile icon={Upload} color="#1c7ed6" />}
          title="Importar respaldo"
          subtitle="Reemplaza los datos de este iPhone"
          chevron
          onClick={() => openSheet({ type: 'backup-import' })}
        />
        <Row
          leading={<IconTile icon={FileSpreadsheet} color="#2f9e63" />}
          title="Exportar CSV"
          subtitle="Para hojas de cálculo, sin cifrar"
          chevron
          onClick={() => openSheet({ type: 'csv-export' })}
        />
      </Group>

      <Group title="Organización">
        <Row
          leading={<IconTile icon={Tags} color="#e8590c" />}
          title="Categorías"
          trailing={categoryCount === undefined ? undefined : String(categoryCount)}
          chevron
          onClick={() => navigate('ajustes/categorias', 'forward')}
        />
      </Group>

      <Group
        title="Almacenamiento"
        footer="Con la protección activa, iOS no borra los datos de Luka aunque el teléfono se quede sin espacio."
      >
        <Row
          leading={<IconTile icon={HardDrive} color="#868e96" />}
          title="Protección contra borrado"
          trailing={persisted === null ? undefined : persisted ? 'Activa' : <span className={styles.link}>Activar</span>}
          onClick={persisted ? undefined : protectStorage}
        />
        <Row
          leading={<IconTile icon={Lock} color="#495057" />}
          title="Movimientos guardados"
          trailing={transactionCount === undefined ? undefined : formatGrouped(transactionCount)}
        />
      </Group>

      <footer className={styles.about}>
        <LogoMark className={styles.mark} />
        <p className={styles.name}>Luka Wallet</p>
        <p className={styles.tagline}>Sin cuentas, sin analíticas, sin servidores. Todo vive en este iPhone.</p>
      </footer>
    </Page>
  )
}
