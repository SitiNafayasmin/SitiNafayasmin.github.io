import QRCode from 'qrcode'
import { sanitizeTableId } from './utils'

export interface QROptions {
  size?: number
  margin?: number
  color?: { dark?: string; light?: string }
}

/**
 * Build a public URL that a customer phone can open by scanning the QR code.
 * Uses the current site origin so the same admin UI works on localhost and
 * on the deployed site without extra configuration.
 */
export function buildTableOrderUrl(tableId: string, origin?: string): string {
  const safe = sanitizeTableId(tableId)
  if (!safe) throw new Error('Invalid table id')
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/order/${encodeURIComponent(safe)}`
}

export async function renderTableQR(
  tableId: string,
  opts: QROptions = {},
): Promise<string> {
  const url = buildTableOrderUrl(tableId)
  return QRCode.toDataURL(url, {
    width: opts.size ?? 320,
    margin: opts.margin ?? 2,
    color: {
      dark: opts.color?.dark ?? '#0f172a',
      light: opts.color?.light ?? '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
}
