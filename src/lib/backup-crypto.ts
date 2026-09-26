export const BACKUP_FORMAT = 'finance-pwa-backup'
export const BACKUP_FORMAT_VERSION = 1
export const PBKDF2_ITERATIONS = 600_000
const MAX_PBKDF2_ITERATIONS = 10_000_000
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedBackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_FORMAT_VERSION
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number }
  cipher: { name: 'AES-GCM'; length: 256 }
  salt: string
  iv: string
  ciphertext: string
}

export class InvalidBackupFileError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidBackupFileError'
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('The password is incorrect or the file was modified.')
    this.name = 'WrongPasswordError'
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function additionalData(iterations: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${BACKUP_FORMAT}:${BACKUP_FORMAT_VERSION}:PBKDF2-SHA256:${iterations}:AES-GCM-256`)
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackup(
  payload: unknown,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<EncryptedBackupFile> {
  if (password.length === 0) throw new Error('Password must not be empty.')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt, iterations)
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(iterations) },
    key,
    plaintext,
  )
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations },
    cipher: { name: 'AES-GCM', length: 256 },
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeField(file: Record<string, unknown>, field: string, expectedLength?: number): Uint8Array<ArrayBuffer> {
  const value = file[field]
  if (typeof value !== 'string' || value.length === 0) throw new InvalidBackupFileError(`Missing ${field}.`)
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = base64ToBytes(value)
  } catch {
    throw new InvalidBackupFileError(`Invalid ${field}.`)
  }
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new InvalidBackupFileError(`Invalid ${field} length.`)
  }
  return bytes
}

export function parseBackupFile(text: string): EncryptedBackupFile {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new InvalidBackupFileError('The file is not valid JSON.')
  }
  if (!isRecord(file) || file.format !== BACKUP_FORMAT) throw new InvalidBackupFileError('Unknown file format.')
  if (file.version !== BACKUP_FORMAT_VERSION) throw new InvalidBackupFileError('Unsupported backup version.')
  const kdf = file.kdf
  if (
    !isRecord(kdf) ||
    kdf.name !== 'PBKDF2' ||
    kdf.hash !== 'SHA-256' ||
    typeof kdf.iterations !== 'number' ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations < PBKDF2_ITERATIONS ||
    kdf.iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new InvalidBackupFileError('Unsupported key derivation settings.')
  }
  const cipher = file.cipher
  if (!isRecord(cipher) || cipher.name !== 'AES-GCM' || cipher.length !== 256) {
    throw new InvalidBackupFileError('Unsupported cipher.')
  }
  decodeField(file, 'salt', SALT_BYTES)
  decodeField(file, 'iv', IV_BYTES)
  decodeField(file, 'ciphertext')
  return file as unknown as EncryptedBackupFile
}

export async function decryptBackup(file: EncryptedBackupFile, password: string): Promise<unknown> {
  const record = file as unknown as Record<string, unknown>
  const salt = decodeField(record, 'salt', SALT_BYTES)
  const iv = decodeField(record, 'iv', IV_BYTES)
  const ciphertext = decodeField(record, 'ciphertext')
  const key = await deriveKey(password, salt, file.kdf.iterations)
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: additionalData(file.kdf.iterations) },
      key,
      ciphertext,
    )
  } catch {
    throw new WrongPasswordError()
  }
  try {
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    throw new InvalidBackupFileError('The decrypted content is not valid JSON.')
  }
}
