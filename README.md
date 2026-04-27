# Xevora POS

A browser-based Point of Sale system with role-based dashboards (**Admin**, **Cashier**, **Kitchen Display**) and a public **Customer QR ordering** flow.

Built with React, TypeScript, Tailwind CSS, and Zustand. Optionally integrates with Supabase for cloud data storage and real-time sync.

## Features

### Admin Dashboard
- Product and category management (CRUD)
- Staff management with PIN-based authentication (PBKDF2-SHA256, salted)
- **Table & QR code management** (generate and download a unique QR per table)
- Sales reports with charts (daily sales, order type breakdown)
- Order history with filters
- Business settings (tax rate, currency, receipt footer, default wait time)
- Data backup and restore (scoped JSON export/import)

### Cashier Dashboard
- Shift management (clock in/out with summaries)
- Touch-friendly product grid with category tabs and search
- Shopping cart with quantity controls
- Order types: Dine-in (with table number), Takeaway, Delivery
- Payment methods: Cash, Card, E-Wallet
- Discount support (clamped to subtotal)
- Hold and recall orders
- Order notes
- **Pending Payments queue** — approve customer QR orders after they pay at the counter, and set an estimated wait time that the customer sees on their phone

### Kitchen Display
- Real-time order queue (syncs across browser tabs via BroadcastChannel)
- Order status tracking: Pending → Preparing → Ready → Completed
- Color-coded priority (blue = new, yellow = preparing, red = overdue)
- Sound alerts for new orders
- Full-screen mode for kitchen monitors
- Shows order details, items, quantities, and special notes
- Orders awaiting customer payment are hidden from the kitchen until the cashier confirms payment.

### Customer QR Ordering (public, no login)
- Each table has a unique QR that links to `/order/<table>`
- Customer picks items → submits → sees **Pay at cashier** screen with a 4-character pickup code
- When the cashier accepts payment, the customer screen flips to **Successful** with order number + estimated wait time
- When the kitchen marks the order **Ready**, the customer screen prompts them to come to the counter

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Charts | Recharts |
| Icons | Lucide React |
| Cloud Database | Supabase (optional) |
| Local Storage | localStorage (fallback) |
| Cross-tab Sync | BroadcastChannel API |

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+

### Installation

```bash
git clone https://github.com/SitiNafayasmin/SitiNafayasmin.github.io.git
cd SitiNafayasmin.github.io
npm install
```

### Configure Supabase (Optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase/schema.sql` in the Supabase SQL Editor
3. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> Without Supabase configured, the app uses localStorage for data persistence.

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Default Login

- **Admin PIN:** `1234` — you'll be required to change it on first login.
- **Kitchen Display:** No PIN required (accessible directly).
- **Customer ordering:** No login. Reached via `/order/<table-label>` (QR codes point here).

## Testing the QR ordering flow

1. Sign in as **Admin** → go to **Tables & QR** and add a table (or use a default one).
2. Click **Download** on the table card and either print the QR, open the link on your phone, or just copy the URL into a new browser tab.
3. On the customer page, add items to the cart and tap **Place Order**. You'll see a **Pay at cashier** screen with a pickup code.
4. In another tab (or the cashier device), sign in as **Cashier** → open **Pending Payments**. You'll see the new order.
5. Pick a payment method + wait time and click **Accept & Pay**. The customer screen automatically updates to **Successful** with an order number and ETA.
6. Open `/kitchen` — the approved order is now in the kitchen queue. Flip it through Preparing → Ready and watch the customer screen update.

## Security

See `SECURITY.md` for the full audit and the full list of hardening changes applied in this release, including:

- PBKDF2-SHA256 + 16-byte random salt for PIN hashing (legacy unsalted SHA-256 hashes are auto-upgraded on next login).
- Login rate limiting with lockout after 5 failed attempts.
- Forced PIN change on first login for the default admin account.
- Supabase Row Level Security (RLS) rewritten to close the previous "allow everything" policies.
- Content Security Policy, `X-Content-Type-Options`, strict referrer policy, and `frame-ancestors 'none'` (clickjacking protection).
- Server-side input validation: sanitized table ids, clamped quantities/prices/discounts, strict backup-import key allowlist.

## Project Structure

```
src/
├── components/
│   └── layout/          # AdminLayout, CashierLayout
├── lib/
│   ├── types.ts         # TypeScript interfaces
│   ├── supabase.ts      # Supabase client
│   ├── localStorage.ts  # Local storage helpers
│   └── utils.ts         # Utility functions
├── stores/
│   ├── authStore.ts     # Authentication & staff
│   ├── productStore.ts  # Products & categories
│   ├── orderStore.ts    # Orders & cart
│   ├── shiftStore.ts    # Shift management
│   └── settingsStore.ts # App settings
├── pages/
│   ├── Landing.tsx      # Role selection
│   ├── Login.tsx        # PIN entry
│   ├── admin/           # Admin dashboard pages
│   ├── cashier/         # Cashier POS & shift pages
│   └── kitchen/         # Kitchen display
├── App.tsx              # Router & app shell
├── main.tsx             # Entry point
└── index.css            # Tailwind imports
```

## License

MIT
