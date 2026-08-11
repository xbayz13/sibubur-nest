import { webcrypto } from 'node:crypto';

// @nestjs/typeorm dist (11.x) memanggil `crypto.randomUUID()` tanpa import module.
// Pada sebagian runtime PM2/CJS (mis. Node via nvm di VPS) identifier global gagal
// resolve di module scope → app crash saat boot dengan
// "ReferenceError: crypto is not defined". Force webcrypto ke global object
// SEBELUM module Nest/TypeORM dimuat (import ini harus PERTAMA di main.ts).
const g = globalThis as { crypto?: unknown };
const cryptoGlobal = g.crypto as { randomUUID?: unknown } | undefined;
if (!cryptoGlobal || typeof cryptoGlobal.randomUUID !== 'function') {
  g.crypto = webcrypto;
}
