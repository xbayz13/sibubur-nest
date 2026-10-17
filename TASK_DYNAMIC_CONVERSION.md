---
title: SiBUBUR — Dynamic Conversion Ratio, Hybrid UI, Real Data Seed
status: in_progress
slug: Update-SiBUBUR-Dynamic-Conversion-Ratio
assigned_to: agent
---

## Context

SiBUBUR adalah POS web app untuk UMKM "Bubur Ayam Lembur Kuring" (1 unit usaha, owner: Ibu Siti Any).
Backend: NestJS + TypeORM + PostgreSQL/SQLite. Frontend: Next.js.

**Problem**: Database VPS kosong (0 data), seeder pakai data dummy random. Untuk Bab 4 skripsi
perlu data yang mencerminkan operasional real warung bubur.

**Repo**: `~/Developer/Skripsi/web/backend/` (backend), `~/Developer/Skripsi/web/frontend/` (frontend)

---

## Design Decisions (SUDAH FINAL — jangan diubah)

### 1. Dynamic Conversion Ratio (porsi ↔ kg beras)

Owner memproduksi bubur dalam **kg beras** (input manual). Owner baru tahu berapa porsi
yang dihasilkan SETAHAR hari selesai (terjual + sisa).

**Alur data**:
```
INPUT OWNER:
  - productionKgBeras = 6 kg         ← pagi, sebelum masak
  - remainingPortions = 30 porsi     ← malam, hitung sisa

SISTEM HITUNG:
  - portionsSold    = SUM(orderItems.quantity) hari itu  ← dari transaksi
  - porridgeAmount  = portionsSold + remainingPortions   ← derived
  - conversionRatio = porridgeAmount / productionKgBeras ← derived
```

**avgConversionRatio** (stabil, untuk rekomendasi):
```
avgConversionRatio = AVG(
  (portionsSold[i] + remainingPortions[i]) / productionKgBeras[i]
) dari N hari historis
```

**Output rekomendasi ganda**:
```
recommendedPorsi  = ceil(avgSalesForDayOfWeek × avgRatio × weatherMultiplier × 1.1)
recommendedKg     = recommendedPorsi / avgConversionRatio  (1 desimal, misal 7.3 kg)
```

**Edge cases**:
- `portionsSold = 0` → tetap masuk hitungan ratio (hari itu produksi besar tapi tidak ada pembeli)
- `productionKgBeras = 0` → SKIP dari perhitungan ratio
- `avgConversionRatio` default = 50 (fallback jika belum ada data historis)

### 2. Flexible Lookback

Default lookback = 30 hari, tapi jika data kurang dari 30 hari tetap dihitung.
Minimum 3 hari data; jika kurang dari 3, return warning "belum cukup data".

### 3. Hybrid UI (Collapsible Detail)

Display rekomendasi:
```
349 porsi  (≈ 7.3 kg beras)

Conversion ratio: 48.1 porsi/kg (18 hari)

[▼ Detail Perhitungan]
  Rata-rata penjualan Sabtu: 280 porsi
  Rasio produksi/penjualan: 1.14
  Multiplier cuaca: 1.0 (Cerah)
  Buffer safety stock: 10%
  280 × 1.14 × 1.0 × 1.1 = 349 porsi
  349 ÷ 48.1 = 7.3 kg beras
```

### 4. Nama Toko: Lembur Kuring (satu toko saja, bukan Okaz)

### 5. avgRatio ditambah ke backend response (sudah ada di rekomendasi, perlu eksplisit di return)

### 6. Cuaca: semua "Cerah" (tidak ada hujan saat data diambil)

---

## Scope Implementasi

### A. Database Migration

Tambah 2 field baru di tabel `productions`:
```typescript
@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
productionKgBeras: number;  // input owner: kg beras yang dimasak

@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
remainingPortions: number;  // input owner: sisa porsi di akhir hari
```

Catatan: field `porridgeAmount` yang sudah ada TETAP dipakai, isinya menjadi
`portionsSold + remainingPortions` (derived). Tidak perlu rename.

### B. Backend — reports.service.ts (getProductionRecommendations)

Update algoritma:
1. Hitung `avgConversionRatio` dari data historis:
   ```
   dailyRatio = (portionsSold + remainingPortions) / productionKgBeras
   avgConversionRatio = average(dailyRatio) dari N hari
   ```
2. Tambah `avgRatio` dan `avgConversionRatio` ke return value
3. Hitung `recommendedKgBeras = recommendedPorsi / avgConversionRatio` (1 desimal)
4. Flexible lookback: gunakan semua data yang tersedia (max 30 hari, min 3 hari)
5. Jika data < 3 hari, return warning + recommendedAmount = 0

### C. Frontend — DailyReportView.tsx (Hybrid UI)

Update section rekomendasi:
1. Display: `{recommendedAmount} porsi (≈ {recommendedKgBeras} kg beras)`
2. Tambah: `Conversion ratio: {avgConversionRatio} porsi/kg ({actualLookbackDays} hari)`
3. Collapsible "Detail Perhitungan":
   - avgSalesForDayOfWeek
   - avgRatio (produksi/penjualan)
   - weatherMultiplier
   - buffer 10%
   - formula chain → final porsi
   - conversion → final kg
4. Semua intermediate values dari backend response

### D. Seed Script — seed-real.ts (BARU, jangan edit seed-productions.ts)

Buat script seed baru khusus data Lembur Kuring. Data dari Google Sheets (18 hari):

**7 baris tanpa tanggal → map ke 24-30 Sep 2026**:
| Tanggal   | Hari    | kg beras | Cuaca | Sisa (porsi) |
|-----------|---------|----------|-------|--------------|
| 2026-09-24 | Kamis  | 5        | Cerah | 30           |
| 2026-09-25 | Jumat  | 7        | Cerah | 0            |
| 2026-09-26 | Sabtu  | 10       | Cerah | 50           |
| 2026-09-27 | Minggu | 13       | Cerah | 0            |
| 2026-09-28 | Senin  | 6        | Cerah | 0            |
| 2026-09-29 | Selasa | 6        | Cerah | 0            |
| 2026-09-30 | Rabu   | 6        | Cerah | 30           |

**11 baris bertanggal 1-11 Okt 2026**:
| Tanggal   | Hari    | kg beras | Cuaca | Sisa (porsi) |
|-----------|---------|----------|-------|--------------|
| 2026-10-01 | Rabu   | 6        | Cerah | 0            |
| 2026-10-02 | Kamis  | 6        | Cerah | 0            |
| 2026-10-03 | Jumat  | 7        | Cerah | 0            |
| 2026-10-04 | Sabtu  | 10       | Cerah | 50           |
| 2026-10-05 | Minggu | 13       | Cerah | 0            |
| 2026-10-06 | Senin  | 6        | Cerah | 0            |
| 2026-10-07 | Selasa | 6        | Cerah | 0            |
| 2026-10-08 | Rabu   | 6        | Cerah | 30           |
| 2026-10-09 | Kamis  | 7        | Cerah | 0            |
| 2026-10-10 | Jumat  | 10       | Cerah | 0            |
| 2026-10-11 | Sabtu  | 10       | Cerah | 50           |

**Seed logic per hari**:
1. `productionKgBeras = kg_beras` (dari sheet)
2. `remainingPortions = sisa_porsi` (dari sheet)
3. `portionsSold = (kg_beras × 50) - sisa_porsi` (estimasi default ratio 50)
4. `porridgeAmount = portionsSold + remainingPortions`
5. Generate orders: total `portionsSold` porsi, mix Bubur Ayam (70%) + Bubur Polos (30%)
6. Generate 1 transaksi per order (mix Cash 60% / QRIS 40%)
7. Seed weather: semua "Cerah", suhu acak 24-28°C
8. Seed expenses: 1-2 per hari (Bahan Baku), range Rp 50.000-150.000
9. Seed karyawan ~10 orang (nama Indonesia umum), absensi acak

**Toko**: `Lembur Kuring` (bukan Okaz/Pabrik Es)

**Jalankan via**: `npm run seed:real` (tambah script di package.json)

### E. Test Verification

Setelah seed, verifikasi:
1. Dashboard: statistik > 0
2. Reports → Laporan Harian (11 Okt 2026): rekomendasi > 0, ada conversion ratio
3. Reports → Laporan Harian (12 Okt 2026): rekomendasi untuk besok dengan kg display
4. `GET /api/reports/recommendation?date=2026-10-12` → cek:
   - `recommendedAmount` > 0
   - `avgConversionRatio` ≈ 50
   - `recommendedKgBeras` ≈ recommendedAmount / 50
   - `avgRatio` > 0
   - `weatherMultiplier` ≈ 1.0 (karena semua Cerah)

---

## Files yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `backend/src/entities/production.entity.ts` | Tambah `productionKgBeras`, `remainingPortions` |
| `backend/src/reports/reports.service.ts` | Update `getProductionRecommendations`: avgConversionRatio, recommendedKgBeras, avgRatio, flexible lookback |
| `backend/src/scripts/seed-real.ts` | BARU: seed script data Lembur Kuring |
| `backend/package.json` | Tambah script `seed:real` |
| `frontend/components/Reports/DailyReportView.tsx` | Hybrid UI: porsi + kg, collapsible detail |

**JANGAN ubah**: `seed-productions.ts`, `seed-master.ts`, `seed-7days.ts` (tetap untuk dummy data)

---

## Constraints & Conventions

- **Language**: TypeScript, NestJS patterns
- **Lint**: `npm run lint` (eslint --fix)
- **Format**: `npm run format` (prettier, singleQuote, trailingComma: all)
- **Test**: `npm test` (unit tests, jest)
- **Build**: `npm run build` (nest build)
- **Commit**: conventional format (feat:/fix:/chore:), JANGAN mention AI
- **Git identity**: `git -c user.name='Ikhsan Pahdian' -c user.email='ikhsanpahdian@Ikhsans-MacBook-Air.local'`
- **Branch**: kerja di branch yang sudah ada atau buat branch baru, push ke origin
- **Don't touch**: existing seed scripts, entities selain production, config files