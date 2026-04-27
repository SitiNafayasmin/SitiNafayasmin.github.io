# Security Audit & Hardening

This document summarises the security review conducted on Xevora POS and the fixes applied in this release.

## Summary

Xevora POS is a single-page React app that can run in two modes:

1. **Local mode** — data lives in `localStorage`. There is no server to attack; the threat model is limited to what someone sitting at the machine can do or what a malicious sibling tab / browser extension / backup file can inject.
2. **Supabase mode** — the app talks directly to Supabase with the publishable `anon` key. Security in this mode is enforced entirely by **Row Level Security (RLS)** in Postgres.

The previous revision of the app had critical issues in both modes. They have all been fixed.

## Previously identified vulnerabilities

| # | Severity | Category | Description |
|---|---|---|---|
| 1 | **Critical** | Access control | `supabase/schema.sql` enabled RLS but added `FOR ALL USING (true)` policies on every table, including `staff.pin_hash`. With the `anon` key embedded in the client bundle, this exposed every row in the database (including PIN hashes) to the public internet. |
| 2 | **High** | Credential storage | PINs were stored as unsalted SHA-256 hashes. Four-digit numeric PINs hashed with unsalted SHA-256 are trivially brute-forced from a rainbow table. |
| 3 | **High** | Authentication | No lockout / rate limiting on PIN login. An attacker with physical access (or a compromised kiosk) could brute-force a PIN offline from the 10 000 numeric space in seconds. |
| 4 | **High** | Privilege escalation | Default admin PIN `1234` was seeded and never required to be changed, so a freshly deployed install shipped with a universally known admin password. |
| 5 | **Medium** | Input validation | The cashier POS accepted any numeric discount (including values greater than subtotal or negative values), and the backup-import dialog `Object.entries(...)`-spread **any** JSON file into `localStorage`, silently clobbering unrelated keys. |
| 6 | **Medium** | Security headers | `index.html` had no CSP, no `X-Content-Type-Options`, no referrer policy, no `frame-ancestors` restriction, so the app could be framed (clickjacking) and a single compromised dependency could silently exfiltrate data. |
| 7 | **Low** | XSS defense in depth | React already escapes all string interpolation, which defends against reflected XSS. Defence in depth (CSP + no inline `<script>`) was missing. |
| 8 | **Low** | Data integrity | Table labels coming from QR URLs were used verbatim with no whitelist, allowing arbitrary strings through `table_number` — not exploitable as an XSS (React escapes it) but it enabled injecting garbage values that would later break sorting / filtering. |

## Fixes applied in this release

### 1. Supabase RLS rewritten (see `supabase/schema.sql`)

- Removed all `FOR ALL USING (true)` policies.
- Public (`anon`) role can:
  - `SELECT` on `categories`, on `products WHERE available = true`, on `tables WHERE active = true`, and `settings` — the menu and branding needed to render the public QR page.
  - `INSERT` into `orders` only when `source = 'customer_qr'` AND `status = 'awaiting_payment'` AND `cashier_id / payment_method / approved_at` are all null. This means customers can create new pending orders but can't spoof paid / approved orders.
  - `INSERT` into `order_items` only when the parent order is a public QR order.
  - `SELECT` individual orders/items by id (for the status-polling page). UUIDs are unguessable.
- `staff` table (including PIN hashes) has **no** `anon` policies, so it is unreadable over the public API.
- Authenticated sessions retain full access — staff workflows are unchanged.
- Running the updated schema is idempotent; the old loose policies are dropped at the top of the file.

### 2. PIN hashing upgraded to PBKDF2-SHA256

- New PINs are hashed with PBKDF2-SHA256, 150 000 iterations, 16-byte random salt, 256-bit output (see `src/lib/utils.ts` → `hashPinPBKDF2` / `verifyPinPBKDF2`).
- Verification uses a length-safe, constant-time string comparison to mitigate timing attacks.
- Existing unsalted SHA-256 hashes are transparently **upgraded on next successful login** — the legacy hash is verified once, then re-hashed with PBKDF2 and the record is rewritten. No user-visible migration step.

### 3. Login rate limiting & lockout

- 5 failed PIN attempts within a 15-minute window lock the login for 15 minutes (see `src/lib/security.ts`).
- The Login UI shows a live countdown to the user.
- Successful logins clear the counter.

### 4. Forced PIN change for default admin

- The seed admin row now has `must_change_pin = true`.
- Any authenticated route wrapped in `ProtectedRoute` renders a blocking **Set a new PIN** modal while this flag is true; the user cannot reach the admin / cashier screens until they pick a new PIN.
- The modal rejects empty PINs, mismatched confirmations, and the literal string `1234`.

### 5. Input validation everywhere

- `sanitizeQuantity`, `sanitizePrice`, `sanitizeDiscount`, `clampNumber`, and `sanitizeTableId` live in `src/lib/utils.ts` / `src/lib/security.ts` and are used inside `orderStore` (not just at the UI layer) so programmatic callers can't bypass them.
- `sanitizeTableId` strips everything but `[a-zA-Z0-9_\- ]`, caps at 32 chars, and rejects empty values — so a malicious QR can't carry weird unicode or path tricks into storage.
- Discounts are clamped `0 <= discount <= subtotal`. Negative / NaN values resolve to 0.
- Quantities are positive integers capped at 999.
- Prices are non-negative and capped at 1 000 000.

### 6. Scoped backup import

- Admin → Settings → Import now:
  - Rejects files larger than 5 MB.
  - Requires the parsed JSON to be a non-array plain object.
  - Accepts only keys that start with `xevora_pos_` and only string values.
  - Clears the existing `xevora_pos_*` keys before import so a partial / malformed backup can't leave half-migrated state.

### 7. Security headers

`index.html` now ships with:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:;
                         style-src 'self' 'unsafe-inline'; script-src 'self';
                         font-src 'self' data:; connect-src 'self' https:;
                         frame-ancestors 'none'; base-uri 'self'; form-action 'self';
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

`frame-ancestors 'none'` blocks clickjacking.  
`connect-src` allows same-origin + any HTTPS host so Supabase still works.  
`'unsafe-inline'` is only kept for `style-src` because Tailwind 4 relies on inline styles; it is **not** set for `script-src`.

When deploying behind a reverse proxy (Nginx, Caddy, Cloudflare), it is recommended to also send `Strict-Transport-Security`, `X-Frame-Options: DENY`, and `Permissions-Policy` as HTTP headers. The meta-tag CSP here is a defence in depth, not a replacement for server-level headers.

### 8. Clean separation of customer vs. staff order surfaces

Customer-submitted orders enter the system with `status='awaiting_payment'` and `source='customer_qr'`. They are:

- Invisible to the kitchen display (which filters on `pending`/`preparing`).
- Listed on a dedicated cashier page (**Pending Payments**) with an explicit **Accept & Pay** button.
- Only released into the kitchen pipeline once a cashier records a real payment and a wait-time estimate.

This enforces the business rule "a customer cannot skip the cashier" at the data-flow level, not just in the UI.

## Operational recommendations

- **Don't reuse the default admin PIN.** First login will now force you to pick a new one; this is intentional.
- **Use a unique Supabase project per deployment.** The `anon` key is public; RLS is the wall.
- **Serve the app over HTTPS** (GitHub Pages and most hosts do this by default). The CSP and hashing assume a secure transport.
- **Back up regularly** using the Settings → Backup button. Keep backups somewhere private — they contain PIN hashes.
- **Rotate staff PINs** from Admin → Staff. Delete departed staff rather than leaving their accounts active.
