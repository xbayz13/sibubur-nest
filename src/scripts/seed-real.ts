import 'dotenv/config';
import { DataSource } from 'typeorm';
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

const REAL_DATA = [
  { date: '2026-09-24', day: 'Kamis', kgBeras: 5, sisa: 30 },
  { date: '2026-09-25', day: 'Jumat', kgBeras: 7, sisa: 0 },
  { date: '2026-09-26', day: 'Sabtu', kgBeras: 10, sisa: 50 },
  { date: '2026-09-27', day: 'Minggu', kgBeras: 13, sisa: 0 },
  { date: '2026-09-28', day: 'Senin', kgBeras: 6, sisa: 0 },
  { date: '2026-09-29', day: 'Selasa', kgBeras: 6, sisa: 0 },
  { date: '2026-09-30', day: 'Rabu', kgBeras: 6, sisa: 30 },
  { date: '2026-10-01', day: 'Kamis', kgBeras: 6, sisa: 0 },
  { date: '2026-10-02', day: 'Jumat', kgBeras: 6, sisa: 0 },
  { date: '2026-10-03', day: 'Sabtu', kgBeras: 7, sisa: 0 },
  { date: '2026-10-04', day: 'Minggu', kgBeras: 10, sisa: 50 },
  { date: '2026-10-05', day: 'Senin', kgBeras: 13, sisa: 0 },
  { date: '2026-10-06', day: 'Selasa', kgBeras: 6, sisa: 0 },
  { date: '2026-10-07', day: 'Rabu', kgBeras: 6, sisa: 0 },
  { date: '2026-10-08', day: 'Kamis', kgBeras: 6, sisa: 30 },
  { date: '2026-10-09', day: 'Jumat', kgBeras: 7, sisa: 0 },
  { date: '2026-10-10', day: 'Sabtu', kgBeras: 10, sisa: 0 },
  { date: '2026-10-11', day: 'Minggu', kgBeras: 10, sisa: 50 },
];

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
      store = storeRepo.create({
        name: 'Lembur Kuring',
      });
      await storeRepo.save(store);
    }

    const authorUser = await userRepo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!authorUser) {
      throw new Error('At least one user is required. Run seed:master first.');
    }

    const bahanBakuCategory = await expenseCatRepo.findOne({
      where: { name: 'Bahan Baku' },
    });
    if (!bahanBakuCategory) {
      throw new Error(
        'Expense category "Bahan Baku" is required. Run seed:master first.',
      );
    }

    const paymentMethods = await paymentMethodRepo.find();
    const cashMethod = paymentMethods.find((pm) => pm.name === 'Cash');
    const qrisMethod = paymentMethods.find((pm) => pm.name === 'QRIS');
    if (!cashMethod || !qrisMethod) {
      throw new Error('Payment methods Cash and QRIS are required.');
    }

    const products = await productRepo.find();
    const buburAyam = products.find((p) => p.name === 'Bubur Ayam');
    const buburPolos = products.find((p) => p.name === 'Bubur Polos');
    if (!buburAyam || !buburPolos) {
      throw new Error('Products Bubur Ayam and Bubur Polos are required.');
    }

    let employees = await employeeRepo.find({
      where: { storeId: store.id },
    });

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
      const { date, day, kgBeras, sisa } = dayData;
      console.log(`\n📅 ${date} (${day}) - ${kgBeras} kg, sisa ${sisa} porsi`);

      const portionsSold = kgBeras * 50 - sisa;
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

      const numExpenses = Math.random() > 0.5 ? 2 : 1;
      for (let i = 0; i < numExpenses; i++) {
        const expense = expenseRepo.create({
          expenseCategoryId: bahanBakuCategory.id,
          totalAmount: 50000 + Math.floor(Math.random() * 100000),
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
          status: isPresent
            ? AttendanceStatus.PRESENT
            : AttendanceStatus.ABSENT,
        });
        await attendanceRepo.save(attendance);
      }

      const buburAyamQty = Math.ceil(portionsSold * 0.7);
      const buburPolosQty = portionsSold - buburAyamQty;

      const numOrders = Math.ceil(portionsSold / 3);

      let remainingAyam = buburAyamQty;
      let remainingPolos = buburPolosQty;

      for (let i = 0; i < numOrders; i++) {
        const orderTime = generateOrderTime(date, 8 + Math.floor(i / 3));

        const orderNumber = `ORD-${date.replace(/-/g, '')}-${String(orderCounter).padStart(4, '0')}`;
        orderCounter++;

        let orderAyam = 0;
        let orderPolos = 0;

        if (i === numOrders - 1) {
          orderAyam = remainingAyam;
          orderPolos = remainingPolos;
        } else {
          const avgPerOrder = Math.ceil(portionsSold / numOrders);
          orderAyam = Math.min(
            remainingAyam,
            Math.max(
              1,
              Math.floor(avgPerOrder * 0.7 + (Math.random() - 0.5) * 2),
            ),
          );
          orderPolos = Math.min(
            remainingPolos,
            Math.max(
              0,
              Math.floor(avgPerOrder * 0.3 + (Math.random() - 0.5) * 2),
            ),
          );
        }

        remainingAyam -= orderAyam;
        remainingPolos -= orderPolos;

        const subtotal =
          orderAyam * Number(buburAyam.price) +
          orderPolos * Number(buburPolos.price);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

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

        if (orderAyam > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: buburAyam.id,
            quantity: orderAyam,
            unitPrice: buburAyam.price,
            lineTotal: orderAyam * Number(buburAyam.price),
          });
          await orderItemRepo.save(orderItem);
        }

        if (orderPolos > 0) {
          const orderItem = orderItemRepo.create({
            orderId: order.id,
            productId: buburPolos.id,
            quantity: orderPolos,
            unitPrice: buburPolos.price,
            lineTotal: orderPolos * Number(buburPolos.price),
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
      }

      console.log(
        `  ✅ Production: ${kgBeras} kg → ${porridgeAmount} porsi (sold: ${portionsSold}, remaining: ${sisa})`,
      );
      console.log(`  ✅ Weather: Cerah`);
      console.log(`  ✅ Expenses: ${numExpenses}`);
      console.log(`  ✅ Attendance: ${employees.length} employees`);
      console.log(`  ✅ Orders: ${numOrders} (${portionsSold} portions total)`);
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
