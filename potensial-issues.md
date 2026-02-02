# Potensial Issues — Status: **SELESAI DIPERBAIKI**

Dokumen ini mencatat potensial issue yang telah diverifikasi dan diperbaiki sesuai best practice NestJS.

---

## Bug 1. Route order: `GET number/:orderNumber` tertimpa oleh `GET :id` — **FIXED**
**Masalah:** Request `GET /orders/number/ORD-123` ditangkap oleh route `@Get(':id')` dengan `id = "number"`.
**Perbaikan:** `@Get('number/:orderNumber')` dipindah ke atas `@Get(':id')` di `src/orders/orders.controller.ts`.

---

## Bug 2. Indentasi tidak konsisten pada endpoint login — **FIXED**
**Masalah:** Blok `@Post('login')` memakai indentasi ekstra (6 spasi).
**Perbaikan:** Indentasi disamakan dengan endpoint lain (2 spasi) di `src/auth/auth.controller.ts`.

---

## Bug 3. Type-safe error handling di catch block — **FIXED**
**Masalah:** Akses `error.code` pada `catch (error)` tidak type-safe (`error` bertipe `unknown`).
**Perbaikan:** Di semua service terkait digunakan pengecekan aman: `const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined` sebelum akses `code`. File: `auth.service.ts`, `users.service.ts`, `stores.service.ts`, `roles.service.ts`, `permissions.service.ts`, `payment-methods.service.ts`, `expense-categories.service.ts`, `product-categories.service.ts`.

---

## Bug 4. Logging debug berlebihan di production (orders controller) — **FIXED**
**Masalah:** Banyak `this.logger.log` dengan data request/user di orders controller.
**Perbaikan:** Semua log debug dihapus; ekstraksi `userId` disederhanakan (JWT strategy sudah set `req.user.id`). Logger dihapus dari controller.

---

## Bug 5. Validasi parameter numerik di reports controller — **FIXED**
**Masalah:** Parameter `year`, `month`, `storeId`, `lookbackDays` bisa bukan angka → `NaN` ke service.
**Perbaikan:** Path params `year`, `month` memakai `ParseIntPipe`; query opsional divalidasi dengan helper `parseOptionalInt` dan `BadRequestException` jika invalid di `src/reports/reports.controller.ts`.

---

## Bug 6. Port dari env sebagai string di main.ts — **FIXED**
**Masalah:** `process.env.PORT` selalu string; port bisa tetap string.
**Perbaikan:** `const port = Number(process.env.PORT) || 3000` di `src/main.ts`.

---

## Bug 7. Env validation: Joi.number() untuk variabel env — **FIXED**
**Masalah:** Variabel env dari `process.env` selalu string; schema `Joi.number()` bisa gagal tanpa koersi.
**Perbaikan:** Helper `numberFromEnv` (Joi.alternatives + string custom) untuk PORT, THROTTLE_TTL, THROTTLE_LIMIT, CACHE_TTL_REPORT, DB_PORT; LOG_SAMPLE_RATE dengan schema terpisah (range 0–1) di `src/config/env.validation.ts`.

---

## Bug 8. Media upload: path traversal via originalname — **FIXED**
**Masalah:** `file.originalname` bisa berisi path berbahaya.
**Perbaikan:** Sanitasi dengan `path.basename(file.originalname || 'file').replace(/\.\./g, '')` sebelum menyusun `fileName` di `src/media/media.service.ts`.

---

## Bug 9. Transaksi create tanpa database transaction — **FIXED**
**Masalah:** Create transaction + update order tidak dalam satu transaksi DB → data tidak konsisten jika salah satu gagal.
**Perbaikan:** Create transaction + update order dibungkus dalam TypeORM `QueryRunner` (startTransaction → commit/rollback → release) di `src/transactions/transactions.service.ts`.

---

## Improvement 10. Owner role permissions kosong — **FIXED**
**Masalah:** Role Owner tanpa `rolePermissions` di DB mengembalikan `permissions: []`.
**Perbaikan:** `AuthModule` mengimpor `PermissionsModule`; di getProfile, jika Owner dan `rolePermissions` kosong, daftar permission diisi dari `PermissionsService.findAll()` (semua slug) di `src/auth/auth.controller.ts`.

---

*Semua issue di atas telah diperbaiki. Build: `npm run build` sukses.*

## Commit Plan

Commit dapat dilakukan per fase atau satu commit gabungan:

**Opsi A — Satu commit gabungan (semua fix):**
```
git add src/auth/auth.controller.ts src/auth/auth.module.ts src/auth/auth.service.ts \
  src/config/env.validation.ts src/expenses/expense-categories.service.ts src/main.ts \
  src/media/media.service.ts src/orders/orders.controller.ts src/permissions/permissions.service.ts \
  src/products/product-categories.service.ts src/reports/reports.controller.ts \
  src/roles/roles.service.ts src/stores/stores.service.ts \
  src/transactions/payment-methods.service.ts src/transactions/transactions.service.ts \
  src/users/users.service.ts potensial-issues.md
git commit -m "fix: resolve potential issues (route order, error handling, validation, tx, owner permissions)"
git push origin main
```

**Opsi B — Per fase (sesuai dokumen awal):**
- Fase 1 (Bug 1+2): `src/orders/orders.controller.ts` `src/auth/auth.controller.ts`
- Fase 2 (Bug 3+4): auth, users, stores, roles, permissions, payment-methods, expense-categories, product-categories, orders.controller
- Fase 3 (Bug 6+7): `src/main.ts` `src/config/env.validation.ts`
- Fase 4 (Bug 5+8): `src/reports/reports.controller.ts` `src/media/media.service.ts`
- Fase 5 (Bug 9+10): `src/transactions/transactions.service.ts` `src/auth/auth.controller.ts` `src/auth/auth.module.ts`