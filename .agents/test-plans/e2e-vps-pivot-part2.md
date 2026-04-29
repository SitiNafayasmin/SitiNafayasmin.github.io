# Xevora POS — E2E Test Plan Part 2 (Customer Flow → Kitchen)

**Branch:** `devin/1777297312-pos-security-qr-ui`
**PR:** https://github.com/SitiNafayasmin/SitiNafayasmin.github.io/pull/3

Part 1 (T1–T4) already recorded and passed:
- T1 Landing Bahasa, T2 Login Bahasa, T3 Admin login real Supabase, T4 Meja & QR.

## Preconditions (already met)

- Dev server on `http://localhost:5173`
- Admin logged in as `admin@xevora.test` in tab 1 (admin window)
- Cashier creds ready: `kasir@xevora.test` / `XevoraKasir123!`

## Data-flow note discovered during execution

Product/Category/Table stores are **localStorage-first** (see
`src/stores/productStore.ts:30-42` and `src/stores/tableStore.ts:28-35`).
The Supabase seed populated `products` server-side, but the client's
Zustand stores do not yet hydrate from Supabase — this is explicitly
listed as a deferred follow-up in the PR description ("Wiring
orderStore / productStore / tableStore to Supabase as primary source").

Consequence: to test the customer order flow, we must add a product
via the admin **Produk** UI first, which writes to localStorage.
Tables auto-seed to `1,2,3,4,5` on first init — these are already
visible because we were on the Tables page.

## Test cases (Part 2)

### T4.5 — Admin adds a product via Produk page
**Setup:** Admin tab → click **Produk** in sidebar.

Evidence code paths:
- `src/pages/admin/Products.tsx:7-60` — uses `useProductStore().addProduct`
- `src/stores/productStore.ts:44-54` — writes to localStorage

- [ ] Click **Add Product** button → form appears
- [ ] Fill name `Nasi Goreng`, price `25000`, select category `Main Course`, set available=true
- [ ] Click Save → product appears in table with price `Rp 25.000`
  (fails if IDR formatting broken → would show `RM25.00` or `$25,000.00`)

### T5 — Customer places order via QR (IDR + Bahasa)
**Setup:** Open new tab → `http://localhost:5173/order/1`

Evidence code paths:
- `src/pages/customer/CustomerMenu.tsx:43-53` — products filtered by category, totals with PPN 11%
- `src/lib/utils.ts` — `formatCurrency` uses `id-ID` locale, no decimals
- `src/lib/i18n.ts` — all customer strings in Bahasa

- [ ] Page header shows `Xevora POS` + `Meja 1`
- [ ] Category tabs include `Semua` and `Main Course` in Bahasa context
- [ ] Product card shows `Nasi Goreng` and price `Rp 25.000` (not `Rp 25,000.00`)
- [ ] Click `+` on Nasi Goreng twice → cart shows 2× Nasi Goreng
- [ ] Totals block displays:
  - `Subtotal` label in Bahasa: `Rp 50.000`
  - `Pajak (11%)` label in Bahasa: `Rp 5.500`
  - `Total`: `Rp 55.500`
- [ ] Submit button reads `Buat Pesanan (2 item) · Rp 55.500`
- [ ] Click submit → redirect to `/order/1/status/<orderId>`
- [ ] Status page shows Bahasa heading indicating "Silakan bayar di kasir" +
  pickup code + IDR totals

**Broken case:** if IDR not wired, totals would render `RM 50.00` or
`$50.00` or `50000` raw — any of these would fail the IDR assertion.
If Bahasa not wired, labels would read `Subtotal`/`Tax (11%)`/`Total`
in English — which would fail the Bahasa assertion.

### T6 — Cashier approves payment → customer flips to BERHASIL

**Setup:** Admin tab → click **Keluar** in sidebar → login as
`kasir@xevora.test` / `XevoraKasir123!`. Navigate to **Menunggu
Pembayaran** in cashier sidebar.

Evidence code paths:
- `src/pages/cashier/PendingPayments.tsx` — queries orders with
  `status=awaiting_payment`; Approve dispatches `approve_order`
- `src/pages/customer/OrderStatus.tsx` — subscribes via BroadcastChannel
  to order updates and re-renders when status transitions

- [ ] Cashier sidebar nav in Bahasa (`Menunggu Pembayaran`, `POS`, …)
- [ ] Pending order appears: Meja 1, pickup code, 2× Nasi Goreng, `Rp 55.500`
- [ ] Payment method dropdown options in Bahasa (`Tunai`, `Kartu`, `E-wallet`)
- [ ] Wait minutes input defaults to `15`; change to `12`
- [ ] Click **Terima & Konfirmasi** → order disappears from pending list

**Switch to customer tab (no refresh):**
- [ ] Customer status page within ~2s auto-flips to large success screen
- [ ] Shows **BERHASIL** (or Bahasa equivalent) heading
- [ ] Order number displayed (e.g. `Pesanan #1`)
- [ ] Estimated wait displayed as `12 menit` (or "sekitar 12 menit")

**Broken case:** if BroadcastChannel wiring regressed, the customer
tab would remain stuck on "Silakan bayar di kasir" — no auto-flip.
If order # missing, that assertion fails.

### T7 — Kitchen picks up approved order

**Setup:** Open new tab → `http://localhost:5173/kitchen`.

Evidence code paths:
- `src/pages/kitchen/KitchenDisplay.tsx` — lists approved orders,
  transitions `approved → preparing → ready` via buttons

- [ ] Kitchen page title in Bahasa (`Dapur`)
- [ ] Approved order appears with Meja 1 + items + pickup code
- [ ] Click **Mulai Siapkan** → status chip flips to `Sedang Disiapkan`
- [ ] Click **Tandai Siap** → status chip flips to `Siap`

**Switch to customer tab (no refresh):**
- [ ] Customer status display mirrors status changes (preparing → ready)

**Broken case:** if kitchen doesn't subscribe to order updates, the
status chip won't change. If customer tab doesn't mirror, broadcast
is broken.

## End of Part 2

Stop recording after T7. Post single PR comment summarizing results
from both Part 1 and Part 2.
