import crypto from 'crypto'
import { env } from './env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

export async function encrypt(text: string): Promise<string> {
  // Generate a random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)

  // Derive key from password and salt
  const key = crypto.pbkdf2Sync(
    env.ENCRYPTION_KEY,
    salt,
    100000, // Number of iterations
    KEY_LENGTH,
    'sha512'
  )

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt the text
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])

  // Get the auth tag
  const tag = cipher.getAuthTag()

  // Combine all components
  const result = Buffer.concat([salt, iv, tag, encrypted])

  return result.toString('base64')
}

export async function decrypt(encryptedText: string): Promise<string> {
  // Convert from base64
  const buffer = Buffer.from(encryptedText, 'base64')

  // Extract components
  const salt = buffer.slice(0, SALT_LENGTH)
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // Derive key from password and salt
  const key = crypto.pbkdf2Sync(
    env.ENCRYPTION_KEY,
    salt,
    100000, // Number of iterations
    KEY_LENGTH,
    'sha512'
  )

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // Decrypt the text
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  return { publicKey, privateKey }
}

export function signMessage(message: string, privateKey: string): string {
  const sign = crypto.createSign('SHA256')
  sign.update(message)
  return sign.sign(privateKey, 'base64')
}

export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const verify = crypto.createVerify('SHA256')
  verify.update(message)
  return verify.verify(publicKey, signature, 'base64')
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex')
  return hash === verifyHash
} 