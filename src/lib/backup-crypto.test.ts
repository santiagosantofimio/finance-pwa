import { describe, expect, it } from 'vitest'
import {
  InvalidBackupFileError,
  PBKDF2_ITERATIONS,
  WrongPasswordError,
  decryptBackup,
  encryptBackup,
  parseBackupFile,
} from './backup-crypto'

const payload = { transactions: [{ id: 'a', amount: 12_500, note: 'Café con ñ' }], exportedAt: '2026-09-26' }

describe('encrypted backup', () => {
  it('round-trips through JSON with the right password', async () => {
    const file = await encryptBackup(payload, 'correct horse battery staple')
    const parsed = parseBackupFile(JSON.stringify(file))
    await expect(decryptBackup(parsed, 'correct horse battery staple')).resolves.toEqual(payload)
  })

  it('stores format metadata and never the password', async () => {
    const file = await encryptBackup(payload, 'secret-password')
    expect(file).toMatchObject({
      format: 'finance-pwa-backup',
      version: 1,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS },
      cipher: { name: 'AES-GCM', length: 256 },
    })
    expect(JSON.stringify(file)).not.toContain('secret-password')
    expect(JSON.stringify(file)).not.toContain('Café')
  })

  it('uses a fresh salt and IV on every export', async () => {
    const first = await encryptBackup(payload, 'same')
    const second = await encryptBackup(payload, 'same')
    expect(first.salt).not.toBe(second.salt)
    expect(first.iv).not.toBe(second.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  it('rejects a wrong password', async () => {
    const file = await encryptBackup(payload, 'right')
    await expect(decryptBackup(file, 'wrong')).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('detects tampered ciphertext', async () => {
    const file = await encryptBackup(payload, 'right')
    const bytes = Uint8Array.from(atob(file.ciphertext), (char) => char.charCodeAt(0))
    bytes[0] ^= 1
    const tampered = { ...file, ciphertext: btoa(String.fromCharCode(...bytes)) }
    await expect(decryptBackup(tampered, 'right')).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('refuses an empty password', async () => {
    await expect(encryptBackup(payload, '')).rejects.toThrow()
  })
})

describe('parseBackupFile', () => {
  it('rejects non-JSON and foreign files', () => {
    expect(() => parseBackupFile('not json')).toThrow(InvalidBackupFileError)
    expect(() => parseBackupFile('{"format":"other"}')).toThrow(InvalidBackupFileError)
  })

  it('rejects unsupported versions and weak key derivation', async () => {
    const file = await encryptBackup(payload, 'x')
    expect(() => parseBackupFile(JSON.stringify({ ...file, version: 2 }))).toThrow(InvalidBackupFileError)
    expect(() => parseBackupFile(JSON.stringify({ ...file, kdf: { ...file.kdf, iterations: 1000 } }))).toThrow(
      InvalidBackupFileError,
    )
  })

  it('rejects malformed salt or IV', async () => {
    const file = await encryptBackup(payload, 'x')
    expect(() => parseBackupFile(JSON.stringify({ ...file, iv: 'AAAA' }))).toThrow(InvalidBackupFileError)
    expect(() => parseBackupFile(JSON.stringify({ ...file, salt: '%%%' }))).toThrow(InvalidBackupFileError)
  })
})
