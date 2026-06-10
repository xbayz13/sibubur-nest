# Backend SIBUBUR

Backend REST API berbasis [NestJS](https://nestjs.com/) untuk aplikasi SIBUBUR (manajemen toko, produk, pesanan, transaksi, dan laporan).

## Fitur Utama
- Autentikasi & otorisasi berbasis JWT + RBAC
- Manajemen toko, produk, addon, dan kategori
- Orders, transactions, dan payment methods
- Laporan penjualan & supplies
- Upload media & static files
- Seed data & migrasi TypeORM

## Tech Stack
- NestJS + TypeScript
- TypeORM (PostgreSQL / SQLite)
- Passport JWT
- Swagger (OpenAPI)
- Jest (unit & e2e)

## Prasyarat
- Node.js ≥ 18
- npm
- PostgreSQL (opsional, fallback ke SQLite)

## Instalasi & Setup

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

### Migrasi & Seed
```bash
npm run migration:run
npm run seed                 # data dummy (non-production)
npm run seed:production      # master data only (production)
npm run create-admin
```

### Testing
```bash
npm test
npm run test:e2e
```

## Environment Variables
Lihat `.env.example` atau `src/config/env.validation.ts` untuk variabel wajib (`JWT_SECRET`, `DATABASE_URL`, dll).

## Struktur Proyek
```
src/
├── auth/          # Login, register, profile, JWT guard
├── orders/
├── products/
├── stores/
├── transactions/
├── reports/
├── entities/      # TypeORM entities
├── migrations/
└── main.ts
```

## Dokumentasi API
Jalankan aplikasi lalu buka http://localhost:3000/api (Swagger).

## Lisensi
MIT
