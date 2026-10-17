# SiBUBUR Backend - Real Data Seeder + Entity Updates

**Agent**: OpenCoder (Backend)  
**Workdir**: `~/Developer/Skripsi/web/backend`  
**Data source**: `SEED_DATA.json` (already in backend root)

---

## TASK 1: Update seed-master.ts

### 1.1 Products
File: `src/scripts/seed-master.ts`

**Current products**:
```typescript
{ name: 'Bubur Ayam', price: 10000 },
{ name: 'Bubur Polos', price: 8000 },
```

**Fix to**:
```typescript
{ name: 'Bubur Ayam Komplit', price: 10000, description: 'Bubur ayam lengkap dengan topping' },
{ name: 'Bubur Ayam Polos', price: 5000, description: 'Bubur tanpa topping' },
{ name: 'Es/Hangat Teh', price: 5000, description: 'Teh manis dingin atau hangat' },
{ name: 'Es/Hangat Jeruk', price: 5000, description: 'Jeruk peras dingin atau hangat' },
```

### 1.2 Stores
**Remove**: "Okaz", "Pabrik Es"  
**Keep only**: "Lembur Kuring"

---

## TASK 2: Rewrite seed-real.ts

File: `src/scripts/seed-real.ts`

### Data Structure
Load from `SEED_DATA.json` in repo root:
```typescript
import * as fs from 'fs';
const seedData = JSON.parse(fs.readFileSync('./SEED_DATA.json', 'utf-8'));
const REAL_DATA = seedData.realData;
```

### Transaction Generation Algorithm
For each day in REAL_DATA:
1. Calculate total items: `komplit + polos + teh + jeruk`
2. Generate orders: **each order = 1-3 items randomly**
3. Distribute sales across orders to match EXACT quantities from JSON
4. Payment: 60% Cash, 40% QRIS
5. **CRITICAL**: Daily total revenue MUST match `day.totalRevenue`

Example logic:
```typescript
const totalItems = sales.buburAyamKomplit + sales.buburAyamPolos + sales.esTeh + sales.esJeruk;
const avgItemsPerOrder = 1.8; // realistic average
const numOrders = Math.ceil(totalItems / avgItemsPerOrder);

// Create a pool of items to distribute
let itemPool = [
  ...Array(sales.buburAyamKomplit).fill('buburAyamKomplit'),
  ...Array(sales.buburAyamPolos).fill('buburAyamPolos'),
  ...Array(sales.esTeh).fill('esTeh'),
  ...Array(sales.esJeruk).fill('esJeruk'),
];

// Shuffle and distribute into orders (1-3 items each)
for (let i = 0; i < numOrders && itemPool.length > 0; i++) {
  const itemsInOrder = Math.min(
    Math.floor(Math.random() * 3) + 1, // 1-3 items
    itemPool.length
  );
  const orderItems = itemPool.splice(0, itemsInOrder);
  // Create order with these items
}
```

### Expense Generation
From `day.expenses` array in JSON:
- Map expense item to category based on keywords:
  - "Ayam|Beras|Minyak|Daun|Cabe|Bumbu|Garam|Kecap|Merica|Gula|Terigu|Jeruk" → Bahan Baku
  - "Cup|Sendok|Aqua|Krupuk" → Kemasan
  - "Gas" → Gas
  - Others → Operasional

```typescript
const expenseRepo = dataSource.getRepository(Expense);
for (const exp of dayData.expenses) {
  const category = getCategoryForItem(exp.item); // implement keyword matching
  const expense = expenseRepo.create({
    expenseCategoryId: category.id,
    description: exp.item, // ← NEW FIELD
    totalAmount: exp.amount,
    storeId: store.id,
    createdAt: generateOrderTime(date, 7),
  });
  await expenseRepo.save(expense);
}
```

### Weather Data
All 18 days = "Cerah" (from JSON)

---

## TASK 3: Add expense.description field

Check if `Expense` entity has `description` field:
```bash
grep -n "description" src/entities/expense.entity.ts
```

If NOT found, add:
```typescript
@Column({ type: 'varchar', length: 255, nullable: true })
description?: string;
```

Then generate migration:
```bash
npm run migration:generate -- -n AddExpenseDescription
```

---

## TASK 4: Add production.portionsSold field

File: `src/entities/production.entity.ts`

Add:
```typescript
@Column({ type: 'integer', nullable: true })
portionsSold?: number;
```

Generate migration:
```bash
npm run migration:generate -- -n AddProductionPortionsSold
```

Update DTOs:
- `UpdateProductionDto`: add `portionsSold?: number`
- `productions.service.ts` update method:
  ```typescript
  if (updateDto.portionsSold !== undefined && updateDto.remainingPortions !== undefined) {
    production.porridgeAmount = updateDto.portionsSold + updateDto.remainingPortions;
  }
  ```

---

## TASK 5: Test & Verify

```bash
# Build
npm run build

# Run tests
npm test

# Verify data structure
node -e "const d = require('./SEED_DATA.json'); console.log('Days:', d.realData.length, 'Revenue check:', d.realData[0].totalRevenue)"
```

Expected output: `Days: 18 Revenue check: 2750000`

---

## TASK 6: Commit

```bash
git add -A
git -c user.name='Ikhsan Pahdian' -c user.email='ikhsanpahdian@Ikhsans-MacBook-Air.local' \
  commit -m "feat: real Lembur Kuring data seed + expense description + production portionsSold"
git push origin main
```

---

## Expected Files Modified:
- src/scripts/seed-master.ts
- src/scripts/seed-real.ts
- src/entities/expense.entity.ts (add description)
- src/entities/production.entity.ts (add portionsSold)
- src/supplies/dto/update-production.dto.ts
- src/supplies/productions.service.ts (update logic)
- src/migrations/[timestamp]-AddExpenseDescription.ts (new)
- src/migrations/[timestamp]-AddProductionPortionsSold.ts (new)

## Revenue Verification:
All 18 days must match exact totals from sheets (2.75M, 3.14M, 4.21M, etc.)