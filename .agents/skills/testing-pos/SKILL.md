# Testing Xevora POS System

## Setup

```bash
cd /home/ubuntu/repos/SitiNafayasmin.github.io
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

The app runs at `http://localhost:5173`.

## Lint & Build

```bash
npm run lint
npm run build   # runs tsc -b && vite build
```

## Default Credentials

- Default Admin PIN: `1234` (all roles use the same PIN by default)
- No Supabase credentials needed for local testing — the app falls back to localStorage

## Devin Secrets Needed

None for local testing. If testing with Supabase, you would need:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Application Architecture

- **State management**: Zustand stores in `src/stores/` (authStore, productStore, orderStore, shiftStore, settingsStore)
- **Data persistence**: localStorage (keys prefixed with `xevora_pos_`)
- **Cross-tab sync**: BroadcastChannel API (`xevora_pos` channel) for Cashier → Kitchen order notifications
- **Authentication**: PIN-based, SHA-256 hashed, stored in Zustand (in-memory). Auth state is lost on full page reload.

## Navigation Structure

- `/` — Landing page with 3 role cards (Admin, Cashier, Kitchen)
- `/login?role=admin` — Admin PIN login
- `/login?role=cashier` — Cashier PIN login
- `/admin` — Admin dashboard (requires auth)
- `/admin/products` — Product & category management
- `/admin/orders` — Order history
- `/admin/reports` — Sales reports with charts
- `/admin/staff` — Staff management
- `/admin/settings` — Business settings & data backup
- `/cashier` — Cashier POS (requires auth + active shift)
- `/cashier/shift` — Shift clock in/out
- `/kitchen` — Kitchen Display (no auth required)

## Primary Test Flow

1. **Clear state**: Run `localStorage.clear()` in browser console for a clean test
2. **Admin login**: Click Admin card → enter PIN 1234 → verify dashboard loads
3. **Create product**: Admin → Products → Add Product → fill name/price → Create
4. **Cashier login**: Logout → Click Cashier → enter PIN 1234
5. **Clock in**: Click "Go to Shift Management" → Clock In
6. **Place order**: Click product in grid → Checkout → Place Order
7. **Kitchen verification**: Open `/kitchen` in new tab → verify order appears with correct items
8. **Status transitions**: Click Start (→ preparing/yellow) → Ready (→ moves to completed section) → Complete
9. **Invalid PIN**: Try PIN 9999 → verify "Invalid PIN" error in red

## Known Quirks

- **Auth state is in-memory only**: Using plain `<a href>` links instead of React Router `<Link>` causes full page reloads that lose auth state. Always use `<Link>` for internal navigation.
- **Kitchen Display filters**: Only "pending" and "preparing" orders show in the active view. "Ready" orders move to the "Recently Completed" section (click "Show Completed" to see them).
- **Cross-tab sync requires same origin**: BroadcastChannel only works between tabs on the same origin. Opening Kitchen in a different browser won't receive updates.
- **Dev server may stop**: If the dev server stops (e.g., due to shell timeout), restart it with `npm run dev -- --host 0.0.0.0 --port 5173`.
- **No CI configured**: This repo has no CI checks. Verify locally with `npm run lint && npm run build`.
