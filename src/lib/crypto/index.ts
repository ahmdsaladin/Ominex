import { Buffer } from 'buffer'

// Convert string to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  return Buffer.from(str, 'utf8')
}

// Convert ArrayBuffer to string
function ab2str(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('utf8')
}

// Generate a random key
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

// Export key to string
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return Buffer.from(exported).toString('base64')
}

// Import key from string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Buffer.from(keyString, 'base64')
  return crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data
export async function encrypt(data: string, keyString: string): Promise<string> {
  try {
    const key = await importKey(keyString)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedData = str2ab(data)

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    )

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)

    return Buffer.from(combined).toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    throw error
  }
}

// Decrypt data
export async function decrypt(
  encryptedData: string,
  keyString: string
): Promise<string> {
  try {
    const key = await importKey(keyString)
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    )

    return ab2str(decryptedData)
  } catch (error) {
    console.error('Decryption error:', error)
    throw error
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('base64')
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const hashedInput = await hashPassword(password)
  return hashedInput === hashedPassword
}

// Generate secure random string
export function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

// Generate secure random number
export function generateSecureRandomNumber(min: number, max: number): number {
  const range = max - min + 1
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const num = Buffer.from(bytes).readUInt32BE(0)
  return min + (num % range)
} 