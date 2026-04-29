# Security Model & Hardening

This document summarises the security model of Xevora POS (VPS / Supabase Auth build) and the hardening changes layered on top of the previous PIN-based prototype.

## Threat model

Xevora POS is a static SPA that talks directly to Supabase (hosted on supabase.com or self-hosted on the operator's VPS). The client is untrusted; Supabase is the source of truth.

Attackers considered:

- **Public on the internet** — can read any URL of the SPA, can call any Supabase endpoint with the `anon` key that is embedded in the bundle, can submit customer QR orders.
- **Former staff** — once their `staff.active` is flipped to `false` (or their staff row is deleted), all their tokens must stop working for writes / non-self reads. Deletion of the `auth.users` row revokes existing refresh tokens.
- **Malicious insider** — a cashier should not be able to read other cashiers' shifts, other staff's emails, settings changes, or inventory mutations.

## Authentication (Supabase Auth)

- Login is email + password, handled entirely by Supabase Auth. Passwords are bcrypt-hashed by GoTrue; the app never sees or stores them.
- Each cashier/admin has a unique auth user, linked to the app's `staff` table via `staff.user_id = auth.users.id`. Per-user shift activity is tracked by writing `cashier_user_id = auth.uid()` on every `shifts` row.
- There is **no shared account and no default PIN.** The operator bootstraps the first admin by inviting themselves from the Supabase dashboard and running a one-line `INSERT` (see `README.md` → Supabase setup).
- New staff are invited from **Admin → Staf → Undang Staf**. That button POSTs to the `invite-staff` Edge Function, which:
  1. Validates that the caller's JWT corresponds to an active admin (`staff.role = 'admin' AND active = true`).
  2. Calls `supabase.auth.admin.inviteUserByEmail()` using the service role key (available only to the Edge Function, never to the browser).
  3. Upserts the matching `staff` row with the chosen role.
  4. Supabase emails the invitee a magic link to `/reset-password`, where they set their own password.
- Client-side login rate limiting: 5 failed attempts per email within 15 minutes → 15-minute lockout (`src/lib/security.ts`). Supabase also applies its own server-side throttling.
- Password reset is supported from the login screen (`sendPasswordReset`) and on `/reset-password`.

## Authorization (RLS)

All tables have RLS enabled. `public.is_staff()` and `public.is_admin()` SECURITY DEFINER functions wrap the `auth.uid()` → staff-row → role lookup so policies stay compact.

| Table | anon (public) | cashier | admin |
|---|---|---|---|
| `categories` | `SELECT` | full | full |
| `products` | `SELECT WHERE available = true` | full | full |
| `tables` | `SELECT WHERE active = true` | full | full |
| `settings` | `SELECT` | `SELECT` | `UPDATE` |
| `staff` | **none** | `SELECT` own row | `SELECT` all |
| `shifts` | none | own rows (via `cashier_user_id = auth.uid()`) | all |
| `orders` | `INSERT` customer_qr/awaiting_payment; `SELECT` by UUID | full | full |
| `order_items` | `INSERT` if parent is customer_qr/awaiting_payment; `SELECT` | full | full |

Notes:

- `staff` is completely invisible to the anon role. Inserts happen exclusively via the `invite-staff` Edge Function (service role).
- Order UUIDs are unguessable, so we allow anon `SELECT` on `orders` and `order_items` so the customer-facing status page works without a session.
- `settings` are globally readable so the customer page can render the business name + currency, but only admins can modify them.

## Edge Function — `invite-staff`

Deployed with:

```bash
supabase functions deploy invite-staff --no-verify-jwt
supabase secrets set PUBLIC_SITE_URL=https://pos.example.com
```

Key properties:

- Never exposed the `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Verifies the caller's JWT by calling `supabase.auth.getUser(jwt)` with the admin client, then confirms the caller has an active admin `staff` row.
- Supports two actions: `invite` (create auth user + staff row + send invite email) and `delete` (revoke auth user + delete staff row).
- Idempotent on re-invite: if the email already exists in `auth.users`, the function reuses it and updates the staff row.

## Input validation

- Email format is validated client-side (`isValidEmail`) and server-side in the Edge Function before calling `inviteUserByEmail`.
- Passwords must be ≥ 8 characters on the client (`isValidPassword`); Supabase enforces its own policy server-side.
- Product prices, order subtotals, tax, discounts are constrained by `CHECK (>= 0)` in Postgres. `discount` on the POS is clamped to `[0, subtotal]` client-side too.
- Order item quantities are `CHECK (quantity > 0 AND quantity <= 999)`.
- Table labels are sanitised against the regex `/^[A-Za-z0-9._-]{1,32}$/` before being written or used to build QR URLs (`sanitizeTableId` in `src/lib/utils.ts`).
- Backup import on `Settings → Impor cadangan` is size-capped at 5 MB and only accepts a fixed allow-list of keys. Unknown keys are dropped.

## Browser-level hardening (`index.html`)

- `<meta http-equiv="Content-Security-Policy">` blocks all inline scripts, restricts connect-src to the Supabase URL, disables plugins, and sets `frame-ancestors 'none'` so the app cannot be iframed (clickjacking).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: DENY` are set via meta tags (reinforce the Nginx/Caddy headers recommended in README).

## Operational notes

- The service role key must **only** live as a Supabase project secret. Never put it in `.env.local` / `vite` env vars (anything with `VITE_` prefix is inlined into the client bundle).
- For VPS deployments, terminate TLS at Nginx/Caddy and keep Supabase behind the same Nginx (same-origin), which sidesteps CORS and ensures only your domain can reach the API with browser CORS rules.
- When a staff member leaves, an admin should click **Hapus** in the Staff page (or flip **Nonaktifkan**). Both flows call the Edge Function; deleting the auth user invalidates any still-open refresh tokens.

## Changelog vs. the previous PIN build

- ❌ Removed: 4-digit PIN auth, `pin_hash` / `pin_salt` / `pin_algo` / `must_change_pin` columns, default admin PIN `1234`, `ChangePinModal` forced reset.
- ✅ Replaced with: Supabase Auth (email + password), per-user `auth.uid()` tracking, role-based RLS via `is_admin()` / `is_staff()`, Edge Function for staff invites.
- ✅ Kept: login rate limiting, input validation, CSP + security headers, unguessable order UUIDs, backup-import allow-list.
