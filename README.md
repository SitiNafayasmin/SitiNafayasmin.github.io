# Xevora POS

A browser-based Point of Sale system with three role-based dashboards: **Admin**, **Cashier**, and **Kitchen Display**.

Built with React, TypeScript, Tailwind CSS, and Zustand. Optionally integrates with Supabase for cloud data storage and real-time sync.

## Features

### Admin Dashboard
- Product and category management (CRUD)
- Staff management with PIN-based authentication
- Sales reports with charts (daily sales, order type breakdown)
- Order history with filters
- Business settings (tax rate, currency, receipt footer)
- Data backup and restore (JSON export/import)

### Cashier Dashboard
- Shift management (clock in/out with summaries)
- Touch-friendly product grid with category tabs and search
- Shopping cart with quantity controls
- Order types: Dine-in (with table number), Takeaway, Delivery
- Payment methods: Cash, Card, E-Wallet
- Discount support
- Hold and recall orders
- Order notes

### Kitchen Display
- Real-time order queue (syncs across browser tabs)
- Order status tracking: Pending → Preparing → Ready → Completed
- Color-coded priority (blue = new, yellow = preparing, red = overdue)
- Sound alerts for new orders
- Full-screen mode for kitchen monitors
- Shows order details, items, quantities, and special notes

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

- **Admin PIN:** `1234`
- **Kitchen Display:** No PIN required (accessible directly)

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
