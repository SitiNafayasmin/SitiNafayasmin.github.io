# Xevora POS — E2E Test Plan (VPS/IDR/Bahasa/Supabase Auth Pivot)

**Branch:** `devin/1777297312-pos-security-qr-ui`
**PR:** https://github.com/SitiNafayasmin/sitinafayasmin.github.io/pull/3
**Target build:** Vite dev server on `http://localhost:5173` (with `.env.local`
pointing to real Supabase project)

## Scope

Verify the three pivot pillars end-to-end, using real Supabase Auth:

1. **Supabase Auth** replaces PIN — log in with email+password, role-gated
   routing (admin vs cashier), per-user shift tracking.
2. **Bahasa Indonesia** — all user-facing copy on the golden-path pages.
3. **IDR** — currency renders `Rp 150.000` (no decimals, `id-ID` locale) on
   every page that shows money.

## Preconditions

- `.env.local` contains real `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- `supabase/schema.sql` applied on the project (provides `is_staff`/`is_admin`
  helpers + anon-only-read policies + staff/shift tables keyed on
  `auth.uid()`).
- At least one **admin** row exists in `staff` with a matching `auth.users`
  entry (password known to tester so login works).
- Optional: **Edge Function `invite-staff` deployed** — required for staff
  invite tests; not required for core POS flow.

Bootstrap steps that Devin performs before starting (uses
`SUPABASE_SERVICE_ROLE_KEY`):

- Re-apply `supabase/schema.sql` to install helpers + policies.
- Create `auth.users` entry `admin@xevora.test` / `XevoraAdmin123!` via
  `supabase.auth.admin.createUser`, insert matching `staff` row with
  `role='admin'`, `active=true`.
- Create `auth.users` entry `kasir@xevora.test` / `XevoraKasir123!` +
  `staff` row with `role='cashier'` (needed to test cashier approval).
- Seed 1 category (Makanan) + 2 products (Nasi Goreng Rp 25.000, Es Teh
  Rp 8.000) so the customer menu has items.
- Ensure default table `1` exists.

## Test cases

### T1 — Landing page renders in Bahasa
**Setup:** Navigate to `/`.

- [ ] Title "Xevora POS" visible
- [ ] Tagline from `t.landing.tagline` visible in Bahasa (e.g. "Sistem kasir
      modern…")
- [ ] Three role tiles: `Admin`, `Kasir`, `Dapur` with Bahasa descriptions
- [ ] Hint about first admin in Bahasa (`t.landing.firstAdminHint`)

### T2 — Login page Bahasa + validation
**Setup:** Click **Admin** tile.

- [ ] Page title `t.login.title` ("Masuk sebagai Staf" / similar)
- [ ] Email input labeled in Bahasa (`Email`)
- [ ] Password input labeled in Bahasa (`Kata Sandi`)
- [ ] "Lupa kata sandi?" reset link visible
- [ ] Submit empty → error "Email tidak valid." in Bahasa
- [ ] Submit invalid email → same Bahasa error

### T3 — Admin login with real Supabase Auth
**Setup:** On `/login?role=admin`, enter `admin@xevora.test` / seeded password.

- [ ] Submit succeeds → redirect to `/admin`
- [ ] Sidebar nav in Bahasa: `Beranda`, `Produk`, `Pesanan`, `Laporan`,
      `Staf`, `Meja & QR`, `Pengaturan`
- [ ] Dashboard shows IDR totals (`Rp 0` if no sales; formatting matters)
- [ ] Tax rate on dashboard uses settings (default 11% PPN)

### T4 — Admin adds a QR table
**Setup:** Admin → **Meja & QR**.

- [ ] Page title in Bahasa
- [ ] Existing tables listed; add a new table `Meja 9`
- [ ] Click "Unduh QR" on new table → PNG downloads
- [ ] QR PNG encodes URL `…/order/9` (verify in status bar / by scanning)

### T5 — Customer places order via QR (IDR + Bahasa)
**Setup:** Open `/order/9` in incognito/2nd browser tab.

- [ ] Header shows business name + `Meja 9`
- [ ] Category tabs in Bahasa (`Semua`, `Makanan`, …)
- [ ] Product prices in IDR: `Rp 25.000` (no decimals, `.` thousands sep)
- [ ] Add 2× Nasi Goreng + 1× Es Teh → cart shows line items in IDR
- [ ] Totals block shows `Subtotal`, `Pajak (11%)`, `Total` in Bahasa + IDR
- [ ] "Buat Pesanan" button shows item count + IDR total
- [ ] Submit → redirect to `/order/9/status/<orderId>`
- [ ] Status screen says "Silakan bayar di kasir" (or equivalent Bahasa) with
      pickup code + order summary in IDR

### T6 — Cashier approves payment → customer flips to BERHASIL
**Setup:** In primary browser, logout → login as `kasir@xevora.test`. Navigate
to **Menunggu Pembayaran**.

- [ ] New pending order appears with Meja 9, pickup code, items, IDR total
- [ ] Payment method selector in Bahasa (`Tunai`, `Kartu`, `E-wallet`)
- [ ] Wait minutes input (default 15)
- [ ] Click **Terima & Konfirmasi** with method `Tunai`, wait 12 min
- [ ] Order disappears from pending list

**Then switch to 2nd tab on customer status page (no refresh needed, should
update via BroadcastChannel or polling):**

- [ ] Status flips to big **BERHASIL** (success) screen in Bahasa
- [ ] Order number shown (e.g. `Pesanan #1`)
- [ ] Estimasi shown as `12 menit` (or "sekitar 12 menit")

### T7 — Kitchen display picks up order
**Setup:** New tab → `/kitchen` (no auth required for kitchen).

- [ ] Page in Bahasa (`Dapur`, `Kosong`, etc.)
- [ ] Approved order appears with items + Meja 9 + pickup code
- [ ] Click **Mulai Siapkan** → status flips to `Sedang Disiapkan`
- [ ] Click **Tandai Siap** → order moves out of pending / shows ready state

**Customer status page:**
- [ ] Shows "Sedang disiapkan" while kitchen works
- [ ] Shows "Siap diambil" after mark-ready

### T8 — IDR formatting on every money-displaying page
Smoke check format `Rp 25.000` appears on:

- [ ] Admin Dashboard (sales totals)
- [ ] Admin Pesanan list (if any orders)
- [ ] Cashier POS (if logging in as cashier)
- [ ] Menunggu Pembayaran
- [ ] Customer Menu
- [ ] Customer OrderStatus

### T9 — Login rate limit (quick check)
- [ ] Enter wrong password 5× in a row → locked with Bahasa error +
      countdown `X menit YY detik`

### T10 — Staff invitation via Edge Function (optional — only if function deployed)
**Setup:** Admin → **Staf**.

- [ ] Invite form in Bahasa (name, email, role)
- [ ] Invite `kasir2@xevora.test` → Edge Function returns `ok` → new row
      appears with status "Menunggu undangan" or similar
- [ ] Supabase dashboard shows new `auth.users` row in invited state

## Out of scope (deferred by PR description)

- `orderStore` / `productStore` / `tableStore` Supabase-primary writes — still
  localStorage, so cross-device sync not tested here.
- Remaining admin pages (Products, Reports, Settings full translation) —
  partially translated; not a blocker for these tests.

## Pass/fail rubric

- **PASS**: T1–T9 all green. T10 optional.
- **FAIL**: Any Bahasa regression, any IDR formatting bug, any flow that
  doesn't flip to BERHASIL after cashier approve, or login that silently
  succeeds without real auth.
