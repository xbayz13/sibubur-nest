import { DataSource } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../users/user.entity';
import { Store } from '../entities/store.entity';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { Production } from '../entities/production.entity';
import { Expense } from '../entities/expense.entity';
import { Attendance } from '../entities/attendance.entity';
import { Employee } from '../entities/employee.entity';

async function viewData() {
  let dbConfig: any;

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password || '',
      database: url.pathname.slice(1),
    };
  } else if (process.env.DB_TYPE === 'postgres') {
    dbConfig = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sibubur',
    };
  } else {
    dbConfig = {
      type: 'sqlite',
      database: process.env.DB_PATH || 'sibubur.db',
    };
  }

  const dataSource = new DataSource({
    ...dbConfig,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // View Users
    const users = await dataSource.getRepository(User).find({
      relations: ['role'],
    });
    console.log('👥 USERS:');
    users.forEach((user) => {
      console.log(`  • ${user.username} (${user.name}) - Role: ${user.role?.name}`);
    });
    console.log('');

    // View Stores
    const stores = await dataSource.getRepository(Store).find();
    console.log('🏪 STORES:');
    stores.forEach((store) => {
      console.log(`  • ${store.name} (ID: ${store.id})`);
    });
    console.log('');

    // View Products
    const products = await dataSource.getRepository(Product).find({
      relations: ['category'],
    });
    console.log('🍲 PRODUCTS:');
    products.forEach((product) => {
      console.log(`  • ${product.name} - Rp ${product.price.toLocaleString('id-ID')} (Category: ${product.category?.name || 'N/A'})`);
    });
    console.log('');

    // View Orders
    const orders = await dataSource.getRepository(Order).find({
      relations: ['store', 'user'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    console.log('🛒 ORDERS (Last 5):');
    orders.forEach((order) => {
      console.log(`  • ${order.orderNumber} - ${order.customerName || 'Walk-in'} - ${order.status} - Rp ${order.totalAmount.toLocaleString('id-ID')} (Store: ${order.store?.name})`);
    });
    console.log('');

    // View Transactions
    const transactions = await dataSource.getRepository(Transaction).find({
      relations: ['paymentMethod', 'store'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    console.log('💵 TRANSACTIONS (Last 5):');
    transactions.forEach((txn) => {
      console.log(`  • ${txn.transactionNumber} - ${txn.paymentMethod?.name} - Rp ${txn.amount.toLocaleString('id-ID')} - ${txn.status}`);
    });
    console.log('');

    // View Productions
    const productions = await dataSource.getRepository(Production).find({
      relations: ['store', 'weather'],
      order: { date: 'DESC' },
      take: 5,
    });
    console.log('🏭 PRODUCTIONS (Last 5):');
    productions.forEach((prod) => {
      const weather = prod.weather?.weatherJson as any;
      const dateStr = prod.date instanceof Date 
        ? prod.date.toISOString().split('T')[0] 
        : String(prod.date).split('T')[0];
      console.log(`  • ${dateStr} - ${prod.store?.name} - Weather: ${weather?.condition || 'N/A'}`);
    });
    console.log('');

    // View Expenses
    const expenses = await dataSource.getRepository(Expense).find({
      relations: ['category', 'store'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    console.log('💸 EXPENSES (Last 5):');
    expenses.forEach((exp) => {
      console.log(`  • ${exp.category?.name} - ${exp.store?.name} - Rp ${exp.totalAmount.toLocaleString('id-ID')}`);
    });
    console.log('');

    // View Employees & Attendances
    const employees = await dataSource.getRepository(Employee).find({
      relations: ['store'],
    });
    console.log('👷 EMPLOYEES & ATTENDANCES:');
    for (const emp of employees) {
      const attendances = await dataSource.getRepository(Attendance).find({
        where: { employeeId: emp.id },
        order: { date: 'DESC' },
        take: 3,
      });
      console.log(`  • ${emp.name} (${emp.store?.name}) - Status: ${emp.status}`);
      attendances.forEach((att) => {
        const dateStr = att.date instanceof Date 
          ? att.date.toISOString().split('T')[0] 
          : String(att.date).split('T')[0];
        console.log(`    - ${dateStr}: ${att.status}`);
      });
    }
    console.log('');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error viewing data:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

viewData();

