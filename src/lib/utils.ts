export function generateId(): string {
  return crypto.randomUUID()
}

const PBKDF2_ITERATIONS = 150_000
const PBKDF2_HASH = 'SHA-256'
const PBKDF2_KEY_LEN_BITS = 256

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const len = hex.length / 2
  const buf = new ArrayBuffer(len)
  const out = new Uint8Array(buf)
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bytesToHex(bytes)
}

export async function hashPinPBKDF2(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const salt = hexToBytes(saltHex)
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LEN_BITS,
  )
  return bytesToHex(new Uint8Array(derived))
}

export async function hashPinLegacySHA256(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(buffer))
}

export async function verifyPinPBKDF2(
  pin: string,
  saltHex: string,
  expectedHex: string,
): Promise<boolean> {
  const actual = await hashPinPBKDF2(pin, saltHex)
  return timingSafeEqual(actual, expectedHex)
}

/**
 * Format an amount in IDR by default (Indonesian Rupiah, no decimals),
 * respecting any currency code set by the admin in Settings.
 */
export function formatCurrency(amount: number, currency = 'IDR'): string {
  const digits = currency === 'IDR' ? 0 : 2
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(digits)}`
  }
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    timeStyle: 'short',
  })
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Short, human-friendly pickup code shown to customers, e.g. "A7F3". */
export function generatePickupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('')
}

/**
 * Sanitize a table id / label from a URL. Keeps alphanumerics, dashes,
 * underscores, and spaces; caps at 32 chars. Defends against XSS / path
 * injection if the value is ever reflected in markup or used as a filename.
 */
export function sanitizeTableId(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/[^a-zA-Z0-9_\- ]+/g, '')
    .trim()
    .slice(0, 32)
}

/** Clamp a number into [min, max]. Returns fallback when value is non-finite. */
export function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback = min,
): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
