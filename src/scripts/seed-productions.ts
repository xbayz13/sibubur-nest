import 'dotenv/config';
import { DataSource, In, Not } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Production } from '../entities/production.entity';
import { ProductionSupply } from '../entities/production-supply.entity';
import { Supply } from '../entities/supply.entity';
import { Store } from '../entities/store.entity';
import { User } from '../users/user.entity';
import {
  ONE_DAY_MS,
  createDateRange,
  dateWithRandomTime,
  growthAdjustedVolume,
  resolveBaseDate,
  resolveDaysBack,
} from './seed-utils/date-helpers';

const TOTAL_OPEX_PER_DAY = 694_583; // combined across stores
const BASE_HIGH_KG = 11.5; // Okaz (higher volume)
const BASE_LOW_KG = 6.5; // Pabrik Es (lower volume)
const COGS_PER_KG = 222_000;
const EMPLOYEE_DAILY_WAGES_TOTAL = 400_000;
const STORE_OPEN_HOUR = 5;
const STORE_CLOSE_HOUR = 23;

function splitOpex(total: number): { storeA: number; storeB: number } {
  const jitter = (Math.random() * 0.08) - 0.04; // +/-4%
  const storeAShare = 0.5 + jitter;
  const a = Math.round(total * storeAShare);
  const b = total - a;
  return { storeA: a, storeB: b };
}

async function bootstrap() {
  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ DB connected');

  try {
    const storeRepo = dataSource.getRepository(Store);
    const userRepo = dataSource.getRepository(User);
    const employeeRepo = dataSource.getRepository(Employee);
    const attendanceRepo = dataSource.getRepository(Attendance);
    const expenseRepo = dataSource.getRepository(Expense);
    const expenseCatRepo = dataSource.getRepository(ExpenseCategory);
    const productionRepo = dataSource.getRepository(Production);
    const productionSupplyRepo = dataSource.getRepository(ProductionSupply);
    const supplyRepo = dataSource.getRepository(Supply);

    const stores = await storeRepo.find({
      where: { name: In(['Okaz', 'Pabrik Es']) },
      order: { id: 'ASC' },
    });

    const highStore = stores.find((s) => s.name === 'Okaz');
    const lowStore = stores.find((s) => s.name === 'Pabrik Es');

    if (!highStore || !lowStore) {
      throw new Error('Stores Okaz and Pabrik Es are required. Run the master seeder first.');
    }

    const authorUser = await userRepo.findOne({ where: { id: Not(0) }, order: { id: 'ASC' } });
    if (!authorUser) {
      throw new Error('At least one user is required to assign as author for productions.');
    }

    const expenseCategories = await expenseCatRepo.find();
    if (!expenseCategories.length) {
      throw new Error('Expense categories are required (e.g., Operasional).');
    }
    const expenseCategoryId = expenseCategories[0].id;

    const supplies = await supplyRepo.find();
    if (!supplies.length) {
      console.warn('No supplies found; production_supplies will be skipped.');
    }

    // Employee fallback: create 6 if empty
    const employeeCount = await employeeRepo.count();
    if (employeeCount === 0) {
      const names = ['Budi', 'Siti', 'Agus', 'Rina', 'Dewi', 'Andi'];
      const baseWage = Math.floor(EMPLOYEE_DAILY_WAGES_TOTAL / names.length);
      const remainder = EMPLOYEE_DAILY_WAGES_TOTAL - baseWage * names.length;

      const employees = names.map((name, idx) => ({
        name,
        storeId: idx % 2 === 0 ? highStore.id : lowStore.id,
        status: EmployeeStatus.ACTIVE,
        dailySalary: baseWage + (idx === names.length - 1 ? remainder : 0),
      }));

      await employeeRepo.insert(employees);
      console.log('Inserted 6 fallback employees.');
    }

    const employees = await employeeRepo.find();
    const baseDate = resolveBaseDate(process.env.SEED_BASE_DATE);
    const daysBack = resolveDaysBack(process.env.SEED_DAYS_BACK);
    const { start, end } = createDateRange(daysBack, baseDate);

    let current = new Date(start);
    let dayIndex = 0;

    while (current <= end) {
      const dateISO = current.toISOString().split('T')[0];

      const highVolume = growthAdjustedVolume(BASE_HIGH_KG, current, end);
      const lowVolume = growthAdjustedVolume(BASE_LOW_KG, current, end);

      const cogsHigh = Math.round(highVolume * COGS_PER_KG);
      const cogsLow = Math.round(lowVolume * COGS_PER_KG);

      const { storeA, storeB } = splitOpex(TOTAL_OPEX_PER_DAY);

      // Attendances for all employees
      const attendanceRows = employees.map((emp) => ({
        date: dateISO as any,
        employeeId: emp.id,
        status: Math.random() < 0.98 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
      }));
      await attendanceRepo.insert(attendanceRows);

      // Expenses (split across two stores)
      await expenseRepo.insert([
        {
          expenseCategoryId,
          storeId: highStore.id,
          totalAmount: storeA,
          createdAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 2) as any,
          updatedAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 2) as any,
        },
        {
          expenseCategoryId,
          storeId: lowStore.id,
          totalAmount: storeB,
          createdAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 2) as any,
          updatedAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 2) as any,
        },
      ]);

      // Productions
      const productionEntities = productionRepo.create(
        [
          {
            date: dateISO as any,
            storeId: highStore.id,
            porridgeAmount: highVolume,
            authorId: authorUser.id,
            createdAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 1) as any,
            updatedAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 1) as any,
          },
          {
            date: dateISO as any,
            storeId: lowStore.id,
            porridgeAmount: lowVolume,
            authorId: authorUser.id,
            createdAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 1) as any,
            updatedAt: dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_OPEN_HOUR + 1) as any,
          },
        ] as Array<Partial<Production>>,
      ) as Production[];

      const productions = await productionRepo.save(productionEntities);

      // Production supplies (if supplies exist) — encode quantity as cost shares
      if (supplies.length) {
        const supIds = supplies.slice(0, 3).map((s) => s.id);
        const dist = [0.5, 0.3, 0.2];

        const makeSupplies = (productionId: number, targetCost: number): Array<Partial<ProductionSupply>> =>
          supIds.map((supplyId, idx) => ({
            productionId,
            supplyId,
            quantity: Math.max(1, Math.round(targetCost * dist[idx])),
          }));

        const psRows: Array<Partial<ProductionSupply>> = [];
        psRows.push(...makeSupplies(productions[0].id, cogsHigh));
        psRows.push(...makeSupplies(productions[1].id, cogsLow));
        await productionSupplyRepo.insert(psRows);
      }

      if (++dayIndex % 30 === 0) {
        console.log(`Seeded up to ${dateISO}`);
      }

      current = new Date(current.getTime() + ONE_DAY_MS);
    }

    console.log('✅ seed:productions complete');
  } catch (error) {
    console.error('❌ seed:productions failed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap();
