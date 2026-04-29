# Xevora POS

Point-of-sale web app for restaurants — **Bahasa Indonesia** UI, **IDR** currency, Supabase-powered backend, designed for VPS deployment.

Built with React 19, TypeScript, Tailwind CSS, Zustand, and Supabase (Auth + Postgres + Edge Functions).

## Fitur / Features

### Admin
- Kelola produk & kategori
- Undang staf lewat email (Supabase Auth — setiap kasir memiliki email & kata sandi sendiri, aktivitas shift tercatat per user)
- Buat dan unduh kode QR per meja
- Laporan penjualan (harian, tipe pesanan, metode pembayaran, produk terlaris)
- Pengaturan bisnis (nama, alamat, PPN %, mata uang, catatan kaki struk, estimasi tunggu default)

### Kasir
- Clock-in / clock-out shift (dilacak berdasarkan `auth.uid()`)
- POS dengan pencarian produk, kategori, keranjang, diskon, catatan
- Antrean **Menunggu Pembayaran** untuk pesanan QR dari pelanggan — konfirmasi pembayaran + set estimasi waktu yang terlihat oleh pelanggan
- Metode pembayaran: Tunai, Kartu, E-Wallet

### Dapur
- Antrean pesanan yang sudah dibayar (sinkron antar-tab via BroadcastChannel)
- Status: Baru → Disiapkan → Siap → Selesai
- Mode layar penuh + alarm pesanan baru

### Pelanggan (tanpa login)
- Pindai QR meja → buka `/order/<label-meja>`
- Tambahkan item → **Buat Pesanan** → layar **Silakan bayar di kasir** dengan kode pengambilan
- Setelah kasir konfirmasi → layar otomatis jadi **Berhasil** + nomor pesanan + estimasi tunggu
- Saat dapur menandai **Siap** → pelanggan diarahkan ke konter

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Auth | **Supabase Auth** (email + password) |
| Database | Supabase Postgres + Row Level Security |
| Backend functions | Supabase Edge Functions (Deno) |
| Cross-tab sync | BroadcastChannel API |
| Icons | Lucide React · Charts: Recharts |

## Getting started (development)

```bash
git clone https://github.com/SitiNafayasmin/SitiNafayasmin.github.io.git
cd SitiNafayasmin.github.io
npm install
cp .env.example .env.local
# edit .env.local: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Without Supabase credentials the app still runs in a **demo/offline mode** using `localStorage` — useful for UI work, but staff auth, staff invite, and server-side RLS are only enforced with a real Supabase project.

## Supabase setup

1. Create a Supabase project (hosted at supabase.com or self-hosted on your VPS — see below).
2. In the SQL editor, run `supabase/schema.sql`. This creates the tables, RLS policies, and `is_admin()` / `is_staff()` helper functions.
3. Deploy the `invite-staff` Edge Function:
   ```bash
   supabase functions deploy invite-staff --no-verify-jwt
   supabase secrets set PUBLIC_SITE_URL=https://your-pos-domain.example.com
   ```
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set automatically for deployed functions.)
4. Bootstrap the first admin (one-time, from the SQL editor):
   ```sql
   -- 1. Invite yourself from the Supabase Auth dashboard (Authentication → Users → Invite user)
   -- 2. Once the auth row exists, create the matching staff row:
   INSERT INTO staff (user_id, email, name, role)
   SELECT id, email, 'Admin Pertama', 'admin'
   FROM auth.users WHERE email = 'you@example.com';
   ```
5. Copy the URL + anon key into `.env.local` (for dev) or set them as build-time env vars on your VPS.

After this, every subsequent staff member is invited from the app: **Admin → Staf → Undang Staf**. They receive an email with a link to `/reset-password` where they set their own password.

## VPS deployment

The app is a static SPA — any static host works. Recommended on a personal VPS:

### Option A — managed Supabase + static SPA

1. Build the SPA: `npm run build` (output in `dist/`).
2. Upload `dist/` to your VPS (e.g. `rsync -az dist/ vps:/var/www/xevora`).
3. Serve with Nginx or Caddy behind HTTPS. Minimum Nginx config:
   ```nginx
   server {
     listen 443 ssl http2;
     server_name pos.example.com;
     root /var/www/xevora;
     index index.html;
     location / { try_files $uri /index.html; }
     add_header X-Content-Type-Options "nosniff" always;
     add_header Referrer-Policy "no-referrer" always;
     add_header X-Frame-Options "DENY" always;
     # (CSP is already set in index.html's <meta>)
   }
   ```
4. Keep Supabase managed (supabase.com) — no server-side work needed.

### Option B — fully self-hosted (Supabase + SPA on one VPS)

1. Install Docker + `supabase` CLI on the VPS.
2. `supabase start` (or run the official [supabase/supabase](https://github.com/supabase/supabase) `docker-compose.yml`). Put Supabase services (Kong gateway, PostgREST, GoTrue, Postgres, Storage, Realtime) on an internal docker network.
3. Put Nginx/Caddy in front of both: proxy `/` → static SPA, proxy `/api`, `/auth`, etc. → Supabase Kong.
4. Set `VITE_SUPABASE_URL=https://pos.example.com` (same origin avoids CORS), rebuild, redeploy `dist/`.
5. Deploy Edge Functions with `supabase functions deploy`.

## Currency & localisation

- Default currency is **IDR** with no decimal places. Formatter uses the Indonesian locale (`id-ID`) — `150000` renders as `Rp 150.000`.
- Tax default is **11% (PPN Indonesia)**. Admin → Pengaturan to change.
- The UI ships only in Bahasa Indonesia. All user-facing strings live in `src/lib/i18n.ts` for a future translation layer.

## Login

All authentication goes through Supabase. There are **no built-in PINs or default credentials** — you must bootstrap an admin via the steps in _Supabase setup_.

- **Admin / Kasir:** login with email + password on the shared `/login` screen.
- **Dapur (Kitchen Display):** public read-only route at `/kitchen`. Put this device behind your restaurant's own network/firewall.
- **Pelanggan (Customer QR):** no login, anonymous public route at `/order/<label-meja>`.

## Testing the QR ordering flow

1. Sign in as **Admin** → **Meja & QR** → add a table and download/print the QR.
2. Scan the QR or open the URL on a phone: add items → **Buat Pesanan** → you'll see **Silakan bayar di kasir** + pickup code.
3. Sign in as **Kasir** → **Menunggu Pembayaran** → pick payment method + set wait minutes → **Terima & Konfirmasi**.
4. The customer screen flips to **BERHASIL** with order number + estimated wait time.
5. Open `/kitchen` — the order is in the queue. Flip through **Mulai siapkan → Tandai siap → Selesai** and the customer screen mirrors the status.

## Security

See `SECURITY.md` for the full model. Highlights for this build:

- Supabase Auth replaces custom PINs; each staff has a unique email + password. Passwords are hashed by Supabase (bcrypt).
- RLS is keyed on `auth.uid()` via `is_staff()` / `is_admin()` helpers. Anon sessions can only read the menu/settings/active tables and insert a single customer QR order.
- Staff invitations use the **`invite-staff` Edge Function** which runs server-side with the service role key — the key is never exposed to the browser. The function validates that the caller is an active admin before calling `auth.admin.inviteUserByEmail`.
- Rate limiting on login (5 attempts → 15-minute lockout per email, client-side).
- CSP, `X-Content-Type-Options`, strict referrer policy, `frame-ancestors 'none'` set in `index.html`.
- Input validation on every store write (table-id charset, clamped quantity/price/discount, allow-listed backup import keys).

## Project structure

```
src/
├── components/
│   ├── layout/          # AdminLayout, CashierLayout
│   └── ui/primitives.tsx  # Button, Card, Badge, etc.
├── lib/
│   ├── i18n.ts          # All UI copy (Bahasa Indonesia)
│   ├── supabase.ts      # Client factory (null if env missing)
│   ├── security.ts      # Email/password validation + login throttle
│   ├── qr.ts            # Table QR URL + PNG rendering
│   └── utils.ts         # Currency formatter (IDR), sanitizers
├── stores/
│   ├── authStore.ts     # Supabase Auth + staff CRUD via Edge Function
│   ├── productStore.ts, orderStore.ts, shiftStore.ts, settingsStore.ts, tableStore.ts
├── pages/
│   ├── Landing.tsx, Login.tsx, ResetPassword.tsx
│   ├── admin/, cashier/, kitchen/, customer/
├── App.tsx              # Router + ProtectedRoute
└── main.tsx
supabase/
├── schema.sql                         # Tables + RLS + helper funcs
└── functions/invite-staff/index.ts    # Deno Edge Function
```

## License

MIT
