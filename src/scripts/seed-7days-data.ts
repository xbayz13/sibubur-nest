import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { Transaction } from '../entities/transaction.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Production } from '../entities/production.entity';
import { ProductionSupply } from '../entities/production-supply.entity';
import { Expense } from '../entities/expense.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';
import { Store } from '../entities/store.entity';
import { User } from '../users/user.entity';
import { Product } from '../entities/product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { Supply } from '../entities/supply.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Employee } from '../entities/employee.entity';
import { Weather } from '../entities/weather.entity';
import { OrderStatus } from '../entities/order.entity';
import { TransactionStatus } from '../entities/transaction.entity';

async function seed7DaysData() {
  const dbConfig = getDatabaseConfig();

  const dataSource = new DataSource({
    type: dbConfig.type as any,
    host: (dbConfig as any).host,
    port: (dbConfig as any).port,
    username: (dbConfig as any).username,
    password: (dbConfig as any).password,
    database: (dbConfig as any).database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Step 1: Delete all transactional data
    console.log('\n🗑️  Deleting existing transactional data...');
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Delete in order to respect foreign key constraints
    const deleteQueries = [
      'DELETE FROM order_item_addons',
      'DELETE FROM order_items',
      'DELETE FROM transactions',
      'DELETE FROM orders',
      'DELETE FROM expenses',
      'DELETE FROM attendances',
      'DELETE FROM production_supplies',
      'DELETE FROM productions',
      'DELETE FROM weathers', // Delete weather data too since it's related to productions
    ];

    for (const query of deleteQueries) {
      try {
        await queryRunner.query(query);
        console.log(`  ✓ ${query}`);
      } catch (error: any) {
        console.log(`  ⚠️  ${query} - ${error.message}`);
      }
    }

    await queryRunner.release();
    console.log('✅ Existing data deleted\n');

    // Step 2: Get existing reference data
    console.log('📋 Loading reference data...');
    const stores = await dataSource.getRepository(Store).find();
    const users = await dataSource.getRepository(User).find();
    const products = await dataSource.getRepository(Product).find();
    const addons = await dataSource.getRepository(ProductAddon).find();
    const supplies = await dataSource.getRepository(Supply).find();
    const expenseCategories = await dataSource.getRepository(ExpenseCategory).find();
    const paymentMethods = await dataSource.getRepository(PaymentMethod).find();
    const employees = await dataSource.getRepository(Employee).find();

    if (stores.length === 0 || users.length === 0 || products.length === 0) {
      console.error('❌ Error: Missing required reference data (stores, users, or products)');
      console.error('   Please run the main seed script first: npm run seed');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log(`  ✓ Stores: ${stores.length}`);
    console.log(`  ✓ Users: ${users.length}`);
    console.log(`  ✓ Products: ${products.length}`);
    console.log(`  ✓ Addons: ${addons.length}`);
    console.log(`  ✓ Supplies: ${supplies.length}`);
    console.log(`  ✓ Expense Categories: ${expenseCategories.length}`);
    console.log(`  ✓ Payment Methods: ${paymentMethods.length}`);
    console.log(`  ✓ Employees: ${employees.length}\n`);

    // Step 3: Generate 7 days of data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    console.log('📅 Generating data for 7 days...');
    console.log(`   From: ${days[0].toISOString().split('T')[0]}`);
    console.log(`   To: ${days[6].toISOString().split('T')[0]}\n`);

    let totalOrders = 0;
    let totalTransactions = 0;
    let totalProductions = 0;
    let totalExpenses = 0;
    let totalAttendances = 0;

    // Get first user as author (usually admin)
    const author = users[0];
    const cashier = users.find(u => u.username?.includes('cashier')) || users[0];

    // Weather conditions
    const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
    const temperatures = [28, 30, 32, 29, 31];
    const humidities = [65, 70, 75, 68, 72];

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const date = days[dayIndex];
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      console.log(`\n📆 Day ${dayIndex + 1}: ${dateStr} (${dayName})`);

      // Create weather data
      const weatherCondition = weatherConditions[dayIndex % weatherConditions.length];
      const temperature = temperatures[dayIndex % temperatures.length];
      const humidity = humidities[dayIndex % humidities.length];

      const weather = dataSource.getRepository(Weather).create({
        date: date,
        locationName: 'Jakarta Pusat',
        locationCode: 'JKT01',
        weatherJson: {
          condition: weatherCondition,
          temperature: temperature,
          humidity: humidity,
        },
      });
      const savedWeather = await dataSource.getRepository(Weather).save(weather);
      console.log(`  ✓ Weather: ${weatherCondition}, ${temperature}°C, ${humidity}%`);

      // Create productions for each store (1 per store per day)
      for (const store of stores) {
        const production = dataSource.getRepository(Production).create({
          date: date,
          storeId: store.id,
          authorId: author.id,
          weatherId: savedWeather.id,
          porridgeAmount: 50 + Math.floor(Math.random() * 50), // 50-100 kg
        });
        const savedProduction = await dataSource.getRepository(Production).save(production);
        totalProductions++;

        // Add production supplies (2-4 supplies per production)
        const numSupplies = 2 + Math.floor(Math.random() * 3);
        const selectedSupplies = supplies
          .sort(() => Math.random() - 0.5)
          .slice(0, numSupplies);

        for (const supply of selectedSupplies) {
          const productionSupply = dataSource.getRepository(ProductionSupply).create({
            productionId: savedProduction.id,
            supplyId: supply.id,
            quantity: 5 + Math.floor(Math.random() * 15), // 5-20 units
          });
          await dataSource.getRepository(ProductionSupply).save(productionSupply);
        }
        console.log(`  ✓ Production: ${store.name} (${savedProduction.porridgeAmount} kg)`);
      }

      // Create expenses (1-2 per store per day)
      for (const store of stores) {
        const numExpenses = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numExpenses; i++) {
          const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
          const expense = dataSource.getRepository(Expense).create({
            expenseCategoryId: category.id,
            storeId: store.id,
            totalAmount: 50000 + Math.floor(Math.random() * 500000), // 50k - 550k
          });
          await dataSource.getRepository(Expense).save(expense);
          totalExpenses++;
        }
        console.log(`  ✓ Expenses: ${store.name} (${numExpenses} records)`);
      }

      // Create attendances (all employees)
      for (const employee of employees) {
        // 90% present, 10% absent
        const status = Math.random() < 0.9 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        const attendance = dataSource.getRepository(Attendance).create({
          date: date,
          employeeId: employee.id,
          status: status,
        });
        await dataSource.getRepository(Attendance).save(attendance);
        totalAttendances++;
      }
      console.log(`  ✓ Attendances: ${employees.length} employees`);

      // Create orders (5-15 orders per store per day)
      // More orders on weekends (Saturday/Sunday = days 5, 6)
      const isWeekend = dayIndex >= 5;
      const ordersPerStore = isWeekend 
        ? 12 + Math.floor(Math.random() * 8) // 12-20 on weekends
        : 5 + Math.floor(Math.random() * 10); // 5-15 on weekdays

      for (const store of stores) {
        for (let orderIndex = 0; orderIndex < ordersPerStore; orderIndex++) {
          // Generate random time within the day (for realistic createdAt)
          const orderDate = new Date(date);
          orderDate.setHours(8 + Math.floor(Math.random() * 12)); // 8 AM - 8 PM
          orderDate.setMinutes(Math.floor(Math.random() * 60));
          orderDate.setSeconds(Math.floor(Math.random() * 60));

          // Create order
          const numItems = 1 + Math.floor(Math.random() * 3); // 1-3 items per order
          const selectedProducts = products
            .sort(() => Math.random() - 0.5)
            .slice(0, numItems);

          let subtotal = 0;
          interface OrderItemData {
            product: Product;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
            addons: Array<{
              addon: ProductAddon;
              quantity: number;
              price: number;
            }>;
          }
          const orderItems: OrderItemData[] = [];

          for (const product of selectedProducts) {
            const quantity = 1 + Math.floor(Math.random() * 2); // 1-2 quantity
            const unitPrice = Number(product.price);
            const lineTotal = unitPrice * quantity;
            subtotal += lineTotal;

            // 50% chance to add addons
            const addonsForItem: Array<{
              addon: ProductAddon;
              quantity: number;
              price: number;
            }> = [];
            if (addons.length > 0 && Math.random() < 0.5) {
              const numAddons = 1 + Math.floor(Math.random() * 2);
              const selectedAddons = addons
                .sort(() => Math.random() - 0.5)
                .slice(0, numAddons);

              for (const addon of selectedAddons) {
                const addonQuantity = 1;
                const addonPrice = Number(addon.price);
                subtotal += addonPrice * addonQuantity;
                addonsForItem.push({
                  addon,
                  quantity: addonQuantity,
                  price: addonPrice,
                });
              }
            }

            orderItems.push({
              product,
              quantity,
              unitPrice,
              lineTotal,
              addons: addonsForItem,
            });
          }

          const tax = subtotal * 0.1; // 10% tax
          const total = subtotal + tax;

          // 70% paid, 30% open
          const status = Math.random() < 0.7 ? OrderStatus.PAID : OrderStatus.OPEN;
          const orderNumber = `ORD-${dateStr.replace(/-/g, '')}-${(totalOrders + 1).toString().padStart(4, '0')}`;
          
          // Customer names
          const customerNames = [
            'Budi Santoso', 'Siti Nurhaliza', 'Ahmad Fauzi', 'Dewi Lestari',
            'Andi Pratama', 'Rina Wati', 'Bambang Suryadi', 'Maya Sari',
            'Eko Prasetyo', 'Fitri Handayani', 'Joko Widodo', 'Sari Indah',
          ];
          const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];

          const order = dataSource.getRepository(Order).create({
            orderNumber,
            customerName: customerName,
            status: status,
            subtotalAmount: subtotal,
            taxAmount: tax,
            totalAmount: total,
            storeId: store.id,
            userId: cashier.id,
            createdAt: orderDate,
            updatedAt: orderDate,
          });
          const savedOrder = await dataSource.getRepository(Order).save(order);
          totalOrders++;

          // Create order items
          for (const itemData of orderItems) {
            const orderItem = dataSource.getRepository(OrderItem).create({
              orderId: savedOrder.id,
              productId: itemData.product.id,
              unitPrice: itemData.unitPrice,
              quantity: itemData.quantity,
              lineTotal: itemData.lineTotal,
            });
            const savedItem = await dataSource.getRepository(OrderItem).save(orderItem);

            // Create order item addons
            for (const addonData of itemData.addons) {
              const orderItemAddon = dataSource.getRepository(OrderItemAddon).create({
                orderItemId: savedItem.id,
                addonId: addonData.addon.id,
                addonPrice: addonData.price,
                quantity: addonData.quantity,
              });
              await dataSource.getRepository(OrderItemAddon).save(orderItemAddon);
            }
          }

          // Create transaction if order is paid
          if (status === OrderStatus.PAID) {
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            const transactionNumber = `TXN-${dateStr.replace(/-/g, '')}-${(totalTransactions + 1).toString().padStart(4, '0')}`;
            
            const transaction = dataSource.getRepository(Transaction).create({
              transactionNumber,
              paymentMethodId: paymentMethod.id,
              amount: total,
              status: TransactionStatus.PAID,
              authorId: cashier.id,
              storeId: store.id,
              orderId: savedOrder.id,
              createdAt: orderDate,
              updatedAt: orderDate,
            });
            await dataSource.getRepository(Transaction).save(transaction);
            totalTransactions++;
          }
        }
        console.log(`  ✓ Orders: ${store.name} (${ordersPerStore} orders, ${Math.floor(ordersPerStore * 0.7)} paid)`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ 7 DAYS DATA GENERATION COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Weather Records: ${days.length}`);
    console.log(`  • Productions: ${totalProductions}`);
    console.log(`  • Expenses: ${totalExpenses}`);
    console.log(`  • Attendances: ${totalAttendances}`);
    console.log(`  • Orders: ${totalOrders}`);
    console.log(`  • Transactions: ${totalTransactions}`);
    console.log(`  • Open Orders: ${totalOrders - totalTransactions}`);
    console.log(`  • Paid Orders: ${totalTransactions}`);
    console.log('\n📅 Date Range:');
    console.log(`  • From: ${days[0].toISOString().split('T')[0]}`);
    console.log(`  • To: ${days[6].toISOString().split('T')[0]}`);
    console.log('\n🚀 You can now test all pages with 7 days of data!');
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error generating 7 days data:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the script
seed7DaysData();

