# Backend SIBUBUR

Backend REST API berbasis [NestJS](https://nestjs.com/) untuk aplikasi SiBubur POS (Point of Sale).

## Fitur Utama

- Autentikasi & otorisasi berbasis JWT + RBAC
- Manajemen toko, produk, addon, dan kategori
- Orders, transactions, dan payment methods
- Laporan penjualan (daily, monthly, yearly)
- Tracking produksi & supply
- Data cuaca (BMKG integration)
- Upload media & static files

## Tech Stack

| Teknologi | Fungsi |
|---|---|
| NestJS + TypeScript | Framework backend |
| TypeORM | ORM + PostgreSQL |
| Passport JWT | Authentication |
| Swagger | API documentation |
| Jest | Unit & E2E testing |

## Prasyarat

- Node.js ≥ 18
- PostgreSQL (opsional, fallback ke SQLite untuk development)

## Instalasi

```bash
npm install
```

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Database Setup

```bash
npm run migration:run           # Jalankan migrasi
npm run seed:master             # Seed data master (roles, permissions, dll)
npm run seed:productions        # Seed histori produksi (1 tahun)
npm run seed:transactions       # Seed histori transaksi (1 tahun)
npm run create-admin            # Buat user admin
```

### Seed Options

| Command | Fungsi |
|---|---|
| `npm run seed:master` | Roles, permissions, payment methods, expense categories |
| `npm run seed:productions` | 1 tahun data: employees, attendances, expenses, productions |
| `npm run seed:transactions` | 1 tahun data: orders, order_items, transactions |

**Environment variables untuk seed:**
- `SEED_BASE_DATE=YYYY-MM-DD` — anchor akhir rentang (default: hari ini)
- `SEED_DAYS_BACK=N` — panjang rentang hari ke belakang (default: 365)

### Pembersihan Data

```bash
npm run db:clean              # Bersihkan semua data (weather diabaikan)
npm run db:clean transactions # Hanya data transaksi
npm run db:clean employees    # Hanya data karyawan
npm run db:clean master       # Data master + transactions & employees
```

### Testing

```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

## Environment Variables

Lihat `.env.example` atau `src/config/env.validation.ts` untuk variabel wajib.

| Variable | Fungsi |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key untuk JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | Token expiry (default: 24h) |
| `CORS_ORIGIN` | Frontend URL untuk CORS |
| `WEATHER_ADM4` | Kode ADM4 BMKG (default: `35.02.17.1015`) |

## Struktur Proyek

```
src/
├── auth/           # Login, register, JWT guard
├── stores/         # Manajemen toko
├── products/       # Produk, kategori, addon
├── orders/         # Pesanan
├── transactions/   # Transaksi & pembayaran
├── employees/      # Karyawan & attendance
├── expenses/       # Pengeluaran
├── reports/        # Laporan (daily/monthly/yearly)
├── weather/        # Data cuaca BMKG
├── media/          # Upload file
├── supplies/       # Persediaan bahan
├── entities/       # TypeORM entities
├── migrations/     # Database migrations
├── scripts/        # Seed & utility scripts
└── main.ts
```

## API Documentation

Jalankan aplikasi lalu buka `http://localhost:3000/api` (Swagger).
