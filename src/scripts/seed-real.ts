import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { getDatabaseConfig } from '../config/database.config';
import { Store } from '../entities/store.entity';
import { User } from '../users/user.entity';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { Production } from '../entities/production.entity';
import { Weather } from '../entities/weather.entity';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Product } from '../entities/product.entity';

const seedData = JSON.parse(fs.readFileSync('./SEED_DATA.json', 'utf-8'));
const REAL_DATA = seedData.realData;

const EMPLOYEE_NAMES = [
  'Budi Santoso',
  'Siti Aminah',
  'Agus Wijaya',
  'Rina Lestari',
  'Dewi Cahaya',
  'Andi Pratama',
  'Fitri Handayani',
  'Joko Susilo',
  'Lina Marlina',
  'Hendra Gunawan',
];

function generateOrderTime(dateStr: string, baseHour: number): Date {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const hour = baseHour + Math.floor(Math.random() * 3);
  const minute = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return date;
}

function getCategoryForItem(item: string, categories: Map<string, ExpenseCategory>): ExpenseCategory {
  const itemLower = item.toLowerCase();
  let category: ExpenseCategory | undefined;
  if (/ayam|beras|minyak|daun|cabe|bumbu|garam|kecap|merica|gula|terigu|jeruk/.test(itemLower)) {
    category = categories.get('Bahan Baku');
  } else if (/cup|sendok|aqua|krupuk|kerupuk/.test(itemLower)) {
    category = categories.get('Kemasan');
  } else if (/gas/.test(itemLower)) {
    category = categories.get('Gas');
  } else {
    category = categories.get('Operasional');
  }
  if (!category) {
    throw new Error(`Expense category not found for item: ${item}`);
  }
  return category;
}

interface OrderCounts {
  buburAyamKomplit: number;
  buburAyamPolos: number;
  esTeh: number;
  esJeruk: number;
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
    const productionRepo = dataSource.getRepository(Production);
    const weatherRepo = dataSource.getRepository(Weather);
    const expenseRepo = dataSource.getRepository(Expense);
    const expenseCatRepo = dataSource.getRepository(ExpenseCategory);
    const orderRepo = dataSource.getRepository(Order);
    const orderItemRepo = dataSource.getRepository(OrderItem);
    const transactionRepo = dataSource.getRepository(Transaction);
    const paymentMethodRepo = dataSource.getRepository(PaymentMethod);
    const productRepo = dataSource.getRepository(Product);

    let store = await storeRepo.findOne({ where: { name: 'Lembur Kuring' } });
    if (!store) {
      console.log('Creating store: Lembur Kuring');
      store = storeRepo.create({ name: 'Lembur Kuring' });
      await storeRepo.save(store);
    }

    const authorUser = await userRepo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!authorUser) {
      throw new Error('At least one user is required. Run seed:master first.');
    }

    const expenseCategories = await expenseCatRepo.find();
    const categoryMap = new Map(expenseCategories.map((c) => [c.name, c]));
    if (!categoryMap.get('Bahan Baku')) {
      throw new Error('Expense categories are required. Run seed:master first.');
    }

    const paymentMethods = await paymentMethodRepo.find();
    const cashMethod = paymentMethods.find((pm) => pm.name === 'Cash');
    const qrisMethod = paymentMethods.find((pm) => pm.name === 'QRIS');
    if (!cashMethod || !qrisMethod) {
      throw new Error('Payment methods Cash and QRIS are required.');
    }

    const products = await productRepo.find();
    const buburAyamKomplit = products.find((p) => p.name === 'Bubur Ayam Komplit');
    const buburAyamPolos = products.find((p) => p.name === 'Bubur Ayam Polos');
    const esTeh = products.find((p) => p.name === 'Es/Hangat Teh');
    const esJeruk = products.find((p) => p.name === 'Es/Hangat Jeruk');
    if (!buburAyamKomplit || !buburAyamPolos || !esTeh || !esJeruk) {
      throw new Error('Products are required. Run seed:master first.');
    }

    let employees = await employeeRepo.find({ where: { storeId: store.id } });
    if (employees.length === 0) {
      console.log(`Creating ${EMPLOYEE_NAMES.length} employees...`);
      for (const name of EMPLOYEE_NAMES) {
        const emp = employeeRepo.create({
          name,
          dailySalary: 50000,
          storeId: store.id,
          status: EmployeeStatus.ACTIVE,
        });
        await employeeRepo.save(emp);
      }
      employees = await employeeRepo.find({ where: { storeId: store.id } });
    }

    console.log(`\n🌾 Seeding 18 days of real data for Lembur Kuring...\n`);

    let orderCounter = 1;

    for (const dayData of REAL_DATA) {
      const { date, day, kgBeras, sisa, sales, totalRevenue, expenses } = dayData;
      console.log(`\n📅 ${date} (${day}) - ${kgBeras} kg, sisa ${sisa} porsi`);

      const portionsSold = sales.buburAyamKomplit + sales.buburAyamPolos;
      const porridgeAmount = portionsSold + sisa;

      const production = productionRepo.create({
        date: date as any,
        storeId: store.id,
        authorId: authorUser.id,
        productionKgBeras: kgBeras,
        remainingPortions: sisa,
        porridgeAmount,
      });
      await productionRepo.save(production);

      const weather = weatherRepo.create({
        date: date as any,
        weatherJson: {
          condition: 'Cerah',
          description: 'Cuaca cerah sepanjang hari',
          temperature: 24 + Math.floor(Math.random() * 5),
          humidity: 60 + Math.floor(Math.random() * 20),
        },
      });
      await weatherRepo.save(weather);

      production.weatherId = weather.id;
      await productionRepo.save(production);

      for (const exp of expenses) {
        const category = getCategoryForItem(exp.item, categoryMap);
        const expense = expenseRepo.create({
          expenseCategoryId: category.id,
          description: exp.item,
          totalAmount: exp.amount,
          storeId: store.id,
          createdAt: generateOrderTime(date, 7),
        });
        await expenseRepo.save(expense);
      }

      for (const emp of employees) {
        const isPresent = Math.random() > 0.15;
        const attendance = attendanceRepo.create({
          employeeId: emp.id,
          date: date as any,
          status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
        });
        await attendanceRepo.save(attendance);
      }

      const totalItems = sales.buburAyamKomplit + sales.buburAyamPolos + sales.esTeh + sales.esJeruk;
      let itemPool = [
        ...Array(sales.buburAyamKomplit).fill('buburAyamKomplit'),
        ...Array(sales.buburAyamPolos).fill('buburAyamPolos'),
        ...Array(sales.esTeh).fill('esTeh'),
        ...Array(sales.esJeruk).fill('esJeruk'),
      ];

      for (let i = itemPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [itemPool[i], itemPool[j]] = [itemPool[j], itemPool[i]];
      }

      let totalOrderRevenue = 0;
      const orders: OrderCounts[] = [];

      while (itemPool.length > 0) {
        const itemsInOrder = Math.min(
          Math.floor(Math.random() * 3) + 1,
          itemPool.length,
        );
        const orderItems = itemPool.splice(0, itemsInOrder);

        const counts: OrderCounts = {
          buburAyamKomplit: orderItems.filter((i) => i === 'buburAyamKomplit').length,
          buburAyamPolos: orderItems.filter((i) => i === 'buburAyamPolos').length,
          esTeh: orderItems.filter((i) => i === 'esTeh').length,
          esJeruk: orderItems.filter((i) => i === 'esJeruk').length,
        };

        orders.push(counts);
      }

      for (let i = 0; i < orders.length; i++) {
        const counts = orders[i];
        const orderNumber = `ORD-${date.replace(/-/g, '')}-${String(orderCounter).padStart(4, '0')}`;
        orderCounter++;

        const hour = 5 + Math.floor((i / orders.length) * 5);
        const minute = Math.floor(Math.random() * 60);
        const orderTime = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);

        const subtotal =
          counts.buburAyamKomplit * Number(buburAyamKomplit.price) +
          counts.buburAyamPolos * Number(buburAyamPolos.price) +
          counts.esTeh * Number(esTeh.price) +
          counts.esJeruk * Number(esJeruk.price);
        const tax = 0;
        const total = subtotal;

        const order = orderRepo.create({
          orderNumber,
          customerName: `Pelanggan ${orderCounter}`,
          status: OrderStatus.PAID,
          subtotalAmount: subtotal,
          taxAmount: tax,
          totalAmount: total,
          storeId: store.id,
          userId: authorUser.id,
          createdAt: orderTime,
        });
        await orderRepo.save(order);

        if (counts.buburAyamKomplit > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: buburAyamKomplit.id,
            quantity: counts.buburAyamKomplit,
            unitPrice: buburAyamKomplit.price,
            lineTotal: counts.buburAyamKomplit * Number(buburAyamKomplit.price),
          });
          await orderItemRepo.save(orderItem);
        }

        if (counts.buburAyamPolos > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: buburAyamPolos.id,
            quantity: counts.buburAyamPolos,
            unitPrice: buburAyamPolos.price,
            lineTotal: counts.buburAyamPolos * Number(buburAyamPolos.price),
          });
          await orderItemRepo.save(orderItem);
        }

        if (counts.esTeh > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: esTeh.id,
            quantity: counts.esTeh,
            unitPrice: esTeh.price,
            lineTotal: counts.esTeh * Number(esTeh.price),
          });
          await orderItemRepo.save(orderItem);
        }

        if (counts.esJeruk > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: esJeruk.id,
            quantity: counts.esJeruk,
            unitPrice: esJeruk.price,
            lineTotal: counts.esJeruk * Number(esJeruk.price),
          });
          await orderItemRepo.save(orderItem);
        }

        const paymentMethod = Math.random() < 0.6 ? cashMethod : qrisMethod;
        const transaction = transactionRepo.create({
          transactionNumber: `TXN-${date.replace(/-/g, '')}-${String(orderCounter).padStart(4, '0')}`,
          paymentMethodId: paymentMethod.id,
          amount: total,
          status: TransactionStatus.PAID,
          authorId: authorUser.id,
          storeId: store.id,
          orderId: order.id,
          createdAt: orderTime,
        });
        await transactionRepo.save(transaction);

        totalOrderRevenue += subtotal;
      }

      console.log(`  ✅ Production: ${kgBeras} kg → ${porridgeAmount} porsi (sold: ${portionsSold}, remaining: ${sisa})`);
      console.log(`  ✅ Weather: Cerah`);
      console.log(`  ✅ Expenses: ${expenses.length}`);
      console.log(`  ✅ Attendance: ${employees.length} employees`);
      console.log(`  ✅ Orders: ${orders.length} (Revenue: Rp${totalOrderRevenue.toLocaleString()} / Target: Rp${totalRevenue.toLocaleString()})`);
    }

    console.log('\n✅ Real data seeding complete!');
    console.log('\nSummary:');
    console.log(`- Store: Lembur Kuring`);
    console.log(`- Employees: ${employees.length}`);
    console.log(`- Date range: 2026-09-24 to 2026-10-11 (18 days)`);
    console.log(`- Total orders: ${orderCounter - 1}`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ DB connection closed');
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
