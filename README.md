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
npm run seed:productions     # 1 tahun historis: employees (fallback), attendances, expenses, productions, production_supplies
npm run seed:transactions    # 1 tahun historis: orders, order_items, transactions (revenue/volume targets)
```

Seeder catatan:
- Jalankan master data dulu (npm run seed atau seed:production) sebelum transactions/productions agar store "Okaz" & "Pabrik Es", payment methods, dan users tersedia.
- Opsi penyesuaian rentang tanggal (dipakai oleh seed:transactions & seed:productions):
  - `SEED_BASE_DATE=YYYY-MM-DD` (UTC, default: hari ini pada 00:00) untuk anchor akhir rentang.
  - `SEED_DAYS_BACK=N` (default: 365) untuk panjang rentang hari ke belakang.

### Pembersihan Data (dengan konfirmasi)
```bash
npm run db:clean              # bersihkan semua data (weather dibiarkan)
npm run db:clean transactions # hanya data transaksi (orders, order_items, transactions, expenses, productions*)
npm run db:clean employees    # hanya data karyawan (employees, attendances)
npm run db:clean master       # data master; juga mengosongkan transactions & employees lebih dulu
npm run weather:get           # fetch BMKG & simpan cuaca hari ini, besok, lusa
npm run weather:cleanup       # deduplicate + bersihkan cuaca lama (konfirmasi "yes" diperlukan)
```

Catatan:
- Script akan menampilkan daftar grup dan tabel yang akan dikosongkan dan meminta konfirmasi: `Are you sure you want to clean this data: ...` Ketik `yes` untuk melanjutkan; input lain akan membatalkan.
- Urutan penghapusan child-first untuk menghindari konflik FK.
- Data cuaca (weather) tidak disentuh.

### Testing
```bash
npm test
npm run test:e2e
```

## Environment Variables
Lihat `.env.example` atau `src/config/env.validation.ts` untuk variabel wajib (`JWT_SECRET`, `DATABASE_URL`, dll).

Tambahan terkait cuaca:
- `WEATHER_ADM4` (opsional, default: `35.02.17.1015`) kode ADM4 untuk fetch BMKG harian.
- `KEEP_WEATHER_DAYS` (opsional, default: `90`) retensi data cuaca (harian, dibersihkan otomatis jika tidak terpakai di produksi).

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
