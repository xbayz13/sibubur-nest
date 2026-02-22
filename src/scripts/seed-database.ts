import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { getDatabaseConfig } from '../config/database.config';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { User } from '../users/user.entity';
import { Store } from '../entities/store.entity';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from './permissions-mapping';
import { ProductCategory } from '../entities/product-category.entity';
import { Product } from '../entities/product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Supply } from '../entities/supply.entity';
import { Weather } from '../entities/weather.entity';
import { Production } from '../entities/production.entity';
import { ProductionSupply } from '../entities/production-supply.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Expense } from '../entities/expense.entity';
import { Attendance, AttendanceStatus } from '../entities/attendance.entity';

async function seedDatabase() {
  // ============================================
  // SAFETY CHECK: Prevent running in production
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    console.error('\n❌ ERROR: Seeder cannot be run in production environment!');
    console.error('   This is a safety measure to prevent data loss.');
    console.error('   If you really need to seed production, use: npm run seed:production');
    console.error('   For creating admin user, use: npm run create-admin');
    process.exit(1);
  }

  // WARNING for non-development environments
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  WARNING: Running seeder in non-development environment!');
    console.warn('   This will DELETE all existing data!');
    console.warn('   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Use same config as app so schema is synced in development (synchronize: true when NODE_ENV !== 'production')
  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Clear existing data (only in development/test)
    console.log('\n🗑️  Clearing existing data...');
    console.log('⚠️  This will DELETE all data in the following tables:');
    const tables = [
      'order_item_addons',
      'order_items',
      'transactions',
      'orders',
      'expenses',
      'attendances',
      'production_supplies',
      'productions',
      'weathers',
      'employees',
      'product_addon_products',
      'products',
      'product_addons',
      'product_categories',
      'supplies',
      'expense_categories',
      'payment_methods',
      'stores',
      'role_permissions',
      'users',
      'permissions',
      'roles',
    ];
    
    tables.forEach(table => console.log(`   - ${table}`));
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    for (const table of tables) {
      try {
        await queryRunner.query(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist yet, ignore
      }
    }
    
    await queryRunner.release();
    console.log('✅ Existing data cleared\n');

    // ============================================
    // STEP 1: RBAC Setup (Roles & Permissions)
    // ============================================
    console.log('📋 Step 1: Creating Roles and Permissions...');
    
    const roles = [
      { name: 'SuperAdmin' }, // SuperAdmin role - bypasses all authorization
      { name: 'Owner' },
      { name: 'Manager' },
      { name: 'Cashier' },
      { name: 'Kitchen Staff' },
    ];

    const savedRoles: Role[] = [];
    for (const roleData of roles) {
      const role = dataSource.getRepository(Role).create(roleData);
      const saved = await dataSource.getRepository(Role).save(role);
      savedRoles.push(saved);
      console.log(`  ✓ Created role: ${saved.name}`);
    }

    // Create all permissions
    const savedPermissions: Permission[] = [];
    const permissionMap = new Map<string, Permission>(); // Map slug to permission for easy lookup

    for (const permData of ALL_PERMISSIONS) {
      const permission = dataSource.getRepository(Permission).create(permData);
      const saved = await dataSource.getRepository(Permission).save(permission);
      savedPermissions.push(saved);
      permissionMap.set(saved.slug, saved);
      console.log(`  ✓ Created permission: ${saved.slug}`);
    }
    console.log(`\n  ✓ Created ${savedPermissions.length} permissions total\n`);

    // Assign permissions to roles
    for (const [roleName, permissionSlugs] of Object.entries(ROLE_PERMISSIONS)) {
      const role = savedRoles.find(r => r.name === roleName);
      if (!role) {
        console.log(`  ⚠️  Role ${roleName} not found, skipping permission assignment`);
        continue;
      }

      let assignedCount = 0;
      for (const slug of permissionSlugs) {
        const permission = permissionMap.get(slug);
        if (permission) {
          const rolePermission = dataSource.getRepository(RolePermission).create({
            roleId: role.id,
            permissionId: permission.id,
          });
          await dataSource.getRepository(RolePermission).save(rolePermission);
          assignedCount++;
        }
      }
      console.log(`  ✓ Assigned ${assignedCount} permissions to ${roleName} role`);
    }
    console.log('');

    // ============================================
    // STEP 2: Create Users
    // ============================================
    console.log('👥 Step 2: Creating Users...');
    
    const superAdminRole = savedRoles.find(r => r.name === 'SuperAdmin')!;
    const ownerRole = savedRoles.find(r => r.name === 'Owner')!;
    const managerRole = savedRoles.find(r => r.name === 'Manager')!;
    const cashierRole = savedRoles.find(r => r.name === 'Cashier')!;
    
    // Create users
    const users = [
      { username: 'superadmin', password: 'superadmin123', name: 'Super Administrator', roleId: superAdminRole.id, storeId: null },
      { username: 'owner', password: 'owner123', name: 'Budi Santoso', roleId: ownerRole.id, storeId: null },
      { username: 'manager1', password: 'manager123', name: 'Siti Nurhaliza', roleId: managerRole.id, storeId: null },
    ];

    const savedUsers: User[] = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = dataSource.getRepository(User).create({
        username: userData.username,
        passwordHash: hashedPassword,
        name: userData.name,
        roleId: userData.roleId,
        storeId: userData.storeId,
      });
      const saved = await dataSource.getRepository(User).save(user);
      savedUsers.push(saved);
      console.log(`  ✓ Created user: ${saved.username} (${saved.name})`);
    }
    console.log('');

    // ============================================
    // STEP 3: Create Stores
    // ============================================
    console.log('🏪 Step 3: Creating Stores...');
    
    const stores = [
      { name: 'SiBubur Cabang Utama' },
      { name: 'SiBubur Cabang Mall' },
      { name: 'SiBubur Cabang Pasar' },
    ];

    const savedStores: Store[] = [];
    for (const storeData of stores) {
      const store = dataSource.getRepository(Store).create(storeData);
      const saved = await dataSource.getRepository(Store).save(store);
      savedStores.push(saved);
      console.log(`  ✓ Created store: ${saved.name}`);
    }
    console.log('');

    // Create cashier users based on stores (1 cashier per store)
    console.log('👤 Step 3.5: Creating Cashier Users for each Store...');
    for (const store of savedStores) {
      const cashierUsername = `cashier_${store.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
      const cashierName = `Kasir ${store.name}`;
      const hashedPassword = await bcrypt.hash('cashier123', 10);
      
      const cashierUser = dataSource.getRepository(User).create({
        username: cashierUsername,
        passwordHash: hashedPassword,
        name: cashierName,
        roleId: cashierRole.id,
        storeId: store.id, // Bind cashier to store
      });
      const savedCashier = await dataSource.getRepository(User).save(cashierUser);
      savedUsers.push(savedCashier);
      console.log(`  ✓ Created cashier: ${savedCashier.username} (${savedCashier.name}) for store: ${store.name}`);
    }
    console.log('');

    // ============================================
    // STEP 4: Create Product Categories & Products
    // ============================================
    console.log('🍲 Step 4: Creating Product Categories and Products...');
    
    const categories = [
      { name: 'Bubur Ayam', description: 'Bubur dengan topping ayam' },
      { name: 'Bubur Kacang Hijau', description: 'Bubur manis kacang hijau' },
      { name: 'Bubur Sumsum', description: 'Bubur manis sumsum' },
    ];

    const savedCategories: ProductCategory[] = [];
    for (const catData of categories) {
      const category = dataSource.getRepository(ProductCategory).create(catData);
      const saved = await dataSource.getRepository(ProductCategory).save(category);
      savedCategories.push(saved);
      console.log(`  ✓ Created category: ${saved.name}`);
    }

    const products = [
      { name: 'Bubur Ayam Biasa', price: 15000, categoryId: savedCategories[0].id, description: 'Bubur ayam dengan topping standar' },
      { name: 'Bubur Ayam Spesial', price: 20000, categoryId: savedCategories[0].id, description: 'Bubur ayam dengan topping lengkap' },
      { name: 'Bubur Kacang Hijau', price: 12000, categoryId: savedCategories[1].id, description: 'Bubur kacang hijau manis' },
      { name: 'Bubur Sumsum', price: 10000, categoryId: savedCategories[2].id, description: 'Bubur sumsum manis' },
      { name: 'Bubur Ayam Komplit', price: 25000, categoryId: savedCategories[0].id, description: 'Bubur ayam dengan semua topping' },
    ];

    const savedProducts: Product[] = [];
    for (const prodData of products) {
      const product = dataSource.getRepository(Product).create({
        name: prodData.name,
        price: prodData.price,
        productCategoryId: prodData.categoryId,
        description: prodData.description,
      });
      const saved = await dataSource.getRepository(Product).save(product);
      savedProducts.push(saved);
      console.log(`  ✓ Created product: ${saved.name} (Rp ${saved.price.toLocaleString('id-ID')})`);
    }
    console.log('');

    // ============================================
    // STEP 5: Create Product Addons
    // ============================================
    console.log('➕ Step 5: Creating Product Addons...');
    
    const addons = [
      { name: 'Kerupuk', price: 2000 },
      { name: 'Kacang', price: 3000 },
      { name: 'Telur', price: 5000 },
      { name: 'Ati Ampela', price: 7000 },
      { name: 'Cakwe', price: 3000 },
    ];

    const savedAddons: ProductAddon[] = [];
    for (const addonData of addons) {
      const addon = dataSource.getRepository(ProductAddon).create(addonData);
      const saved = await dataSource.getRepository(ProductAddon).save(addon);
      savedAddons.push(saved);
      console.log(`  ✓ Created addon: ${saved.name} (Rp ${saved.price.toLocaleString('id-ID')})`);
    }

    // Link addons to products
    for (const product of savedProducts.slice(0, 3)) { // Link to first 3 products
      for (const addon of savedAddons.slice(0, 3)) { // Link first 3 addons
        const productAddon = dataSource.getRepository(ProductAddonProduct).create({
          productId: product.id,
          addonId: addon.id,
        });
        await dataSource.getRepository(ProductAddonProduct).save(productAddon);
      }
    }
    console.log('  ✓ Linked addons to products\n');

    // ============================================
    // STEP 6: Create Employees
    // ============================================
    console.log('👷 Step 6: Creating Employees...');
    
    const employees = [
      { name: 'Andi Pratama', storeId: savedStores[0].id, dailySalary: 100000, status: EmployeeStatus.ACTIVE },
      { name: 'Rina Wati', storeId: savedStores[0].id, dailySalary: 120000, status: EmployeeStatus.ACTIVE },
      { name: 'Bambang Suryadi', storeId: savedStores[1].id, dailySalary: 100000, status: EmployeeStatus.ACTIVE },
      { name: 'Dewi Lestari', storeId: savedStores[1].id, dailySalary: 110000, status: EmployeeStatus.ACTIVE },
    ];

    const savedEmployees: Employee[] = [];
    for (const empData of employees) {
      const employee = dataSource.getRepository(Employee).create(empData);
      const saved = await dataSource.getRepository(Employee).save(employee);
      savedEmployees.push(saved);
      console.log(`  ✓ Created employee: ${saved.name} (Store: ${savedStores.find(s => s.id === saved.storeId)?.name})`);
    }
    console.log('');

    // ============================================
    // STEP 7: Create Payment Methods
    // ============================================
    console.log('💳 Step 7: Creating Payment Methods...');
    
    const paymentMethods = [
      { name: 'Cash' },
      { name: 'QRIS' },
    ];

    const savedPaymentMethods: PaymentMethod[] = [];
    for (const pmData of paymentMethods) {
      const pm = dataSource.getRepository(PaymentMethod).create(pmData);
      const saved = await dataSource.getRepository(PaymentMethod).save(pm);
      savedPaymentMethods.push(saved);
      console.log(`  ✓ Created payment method: ${saved.name}`);
    }
    console.log('');

    // ============================================
    // STEP 8: Create Expense Categories
    // ============================================
    console.log('💰 Step 8: Creating Expense Categories...');
    
    const expenseCategories = [
      { name: 'Bahan Baku' },
      { name: 'Operasional' },
      { name: 'Transportasi' },
      { name: 'Lain-lain' },
    ];

    const savedExpenseCategories: ExpenseCategory[] = [];
    for (const ecData of expenseCategories) {
      const ec = dataSource.getRepository(ExpenseCategory).create(ecData);
      const saved = await dataSource.getRepository(ExpenseCategory).save(ec);
      savedExpenseCategories.push(saved);
      console.log(`  ✓ Created expense category: ${saved.name}`);
    }
    console.log('');

    // ============================================
    // STEP 9: Create Supplies
    // ============================================
    console.log('📦 Step 9: Creating Supplies...');
    
    const supplies = [
      { name: 'Beras', unit: 'kg', stock: 50, minStock: 20 },
      { name: 'Ayam', unit: 'kg', stock: 30, minStock: 15 },
      { name: 'Kacang Hijau', unit: 'kg', stock: 25, minStock: 10 },
      { name: 'Gula', unit: 'kg', stock: 40, minStock: 15 },
      { name: 'Garam', unit: 'kg', stock: 20, minStock: 5 },
      { name: 'Minyak', unit: 'liter', stock: 15, minStock: 5 },
    ];

    const savedSupplies: Supply[] = [];
    for (const supplyData of supplies) {
      const supply = dataSource.getRepository(Supply).create(supplyData);
      const saved = await dataSource.getRepository(Supply).save(supply);
      savedSupplies.push(saved);
      console.log(`  ✓ Created supply: ${saved.name} (${saved.stock} ${saved.unit}, min: ${saved.minStock})`);
    }
    console.log('');

    // ============================================
    // STEP 10: Create Weather Data & Production
    // ============================================
    console.log('🌤️  Step 10: Creating Weather Data and Production Records...');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weatherData = [
      {
        date: yesterday,
        locationName: 'Jakarta Pusat',
        locationCode: 'JKT01',
        weatherJson: { condition: 'Sunny', temperature: 32, humidity: 65 },
      },
      {
        date: today,
        locationName: 'Jakarta Pusat',
        locationCode: 'JKT01',
        weatherJson: { condition: 'Cloudy', temperature: 30, humidity: 70 },
      },
    ];

    const savedWeathers: Weather[] = [];
    for (const weatherDataItem of weatherData) {
      const weather = dataSource.getRepository(Weather).create(weatherDataItem);
      const saved = await dataSource.getRepository(Weather).save(weather);
      savedWeathers.push(saved);
      console.log(`  ✓ Created weather: ${saved.date.toISOString().split('T')[0]} - ${saved.weatherJson.condition}`);
    }

    // Create production records
    const productions = [
      {
        date: yesterday,
        storeId: savedStores[0].id,
        authorId: savedUsers[0].id,
        weatherId: savedWeathers[0].id,
        supplies: [
          { supplyId: savedSupplies[0].id, quantity: 10 },
          { supplyId: savedSupplies[1].id, quantity: 5 },
          { supplyId: savedSupplies[2].id, quantity: 3 },
        ],
      },
      {
        date: today,
        storeId: savedStores[0].id,
        authorId: savedUsers[0].id,
        weatherId: savedWeathers[1].id,
        supplies: [
          { supplyId: savedSupplies[0].id, quantity: 12 },
          { supplyId: savedSupplies[1].id, quantity: 6 },
          { supplyId: savedSupplies[2].id, quantity: 4 },
        ],
      },
    ];

    for (const prodData of productions) {
      const production = dataSource.getRepository(Production).create({
        date: prodData.date,
        storeId: prodData.storeId,
        authorId: prodData.authorId,
        weatherId: prodData.weatherId,
      });
      const savedProduction = await dataSource.getRepository(Production).save(production);
      
      for (const supplyData of prodData.supplies) {
        const prodSupply = dataSource.getRepository(ProductionSupply).create({
          productionId: savedProduction.id,
          supplyId: supplyData.supplyId,
          quantity: supplyData.quantity,
        });
        await dataSource.getRepository(ProductionSupply).save(prodSupply);
      }
      console.log(`  ✓ Created production: ${prodData.date.toISOString().split('T')[0]} for ${savedStores.find(s => s.id === prodData.storeId)?.name}`);
    }
    console.log('');

    // ============================================
    // STEP 11: Create Orders
    // ============================================
    console.log('🛒 Step 11: Creating Orders...');
    
    const ordersData = [
      {
        customerName: 'Budi Santoso',
        storeId: savedStores[0].id,
        userId: savedUsers[2].id, // Cashier
        items: [
          { productId: savedProducts[0].id, quantity: 2, addons: [{ addonId: savedAddons[0].id, quantity: 2, price: savedAddons[0].price }] },
          { productId: savedProducts[2].id, quantity: 1 },
        ],
      },
      {
        customerName: 'Siti Nurhaliza',
        storeId: savedStores[0].id,
        userId: savedUsers[2].id,
        items: [
          { productId: savedProducts[1].id, quantity: 1, addons: [{ addonId: savedAddons[2].id, quantity: 1, price: savedAddons[2].price }] },
        ],
      },
      {
        customerName: 'Ahmad Fauzi',
        storeId: savedStores[0].id,
        userId: savedUsers[2].id,
        items: [
          { productId: savedProducts[4].id, quantity: 1 },
          { productId: savedProducts[3].id, quantity: 2 },
        ],
      },
    ];

    const savedOrders: Order[] = [];
    for (const orderData of ordersData) {
      // Calculate totals
      let subtotal = 0;
      for (const item of orderData.items) {
        const product = savedProducts.find(p => p.id === item.productId)!;
        subtotal += product.price * item.quantity;
        if (item.addons) {
          for (const addon of item.addons) {
            subtotal += addon.price * addon.quantity;
          }
        }
      }
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const order = dataSource.getRepository(Order).create({
        orderNumber,
        customerName: orderData.customerName,
        status: OrderStatus.OPEN,
        subtotalAmount: subtotal,
        taxAmount: tax,
        totalAmount: total,
        storeId: orderData.storeId,
        userId: orderData.userId,
      });
      const savedOrder = await dataSource.getRepository(Order).save(order);
      savedOrders.push(savedOrder);

      // Create order items
      for (const itemData of orderData.items) {
        const product = savedProducts.find(p => p.id === itemData.productId)!;
        const orderItem = dataSource.getRepository(OrderItem).create({
          orderId: savedOrder.id,
          productId: itemData.productId,
          unitPrice: product.price,
          quantity: itemData.quantity,
          lineTotal: product.price * itemData.quantity,
        });
        const savedItem = await dataSource.getRepository(OrderItem).save(orderItem);

        // Create order item addons
        if (itemData.addons) {
          for (const addonData of itemData.addons) {
            const orderItemAddon = dataSource.getRepository(OrderItemAddon).create({
              orderItemId: savedItem.id,
              addonId: addonData.addonId,
              addonPrice: addonData.price,
              quantity: addonData.quantity,
            });
            await dataSource.getRepository(OrderItemAddon).save(orderItemAddon);
          }
        }
      }

      console.log(`  ✓ Created order: ${savedOrder.orderNumber} - ${savedOrder.customerName} (Rp ${savedOrder.totalAmount.toLocaleString('id-ID')})`);
    }
    console.log('');

    // ============================================
    // STEP 12: Create Transactions (Payments)
    // ============================================
    console.log('💵 Step 12: Creating Transactions...');
    
    for (let i = 0; i < savedOrders.length; i++) {
      const order = savedOrders[i];
      const transactionNumber = `TXN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const transaction = dataSource.getRepository(Transaction).create({
        transactionNumber,
        paymentMethodId: savedPaymentMethods[i % savedPaymentMethods.length].id,
        amount: order.totalAmount,
        status: TransactionStatus.PAID,
        authorId: savedUsers[2].id, // Cashier
        storeId: order.storeId,
        orderId: order.id,
      });
      const savedTransaction = await dataSource.getRepository(Transaction).save(transaction);

      // Mark order as paid
      order.status = OrderStatus.PAID;
      await dataSource.getRepository(Order).save(order);

      console.log(`  ✓ Created transaction: ${savedTransaction.transactionNumber} - ${savedPaymentMethods[i % savedPaymentMethods.length].name} (Rp ${savedTransaction.amount.toLocaleString('id-ID')})`);
    }
    console.log('');

    // ============================================
    // STEP 13: Create Expenses
    // ============================================
    console.log('💸 Step 13: Creating Expenses...');
    
    const expenses = [
      { categoryId: savedExpenseCategories[0].id, storeId: savedStores[0].id, totalAmount: 500000 },
      { categoryId: savedExpenseCategories[1].id, storeId: savedStores[0].id, totalAmount: 200000 },
      { categoryId: savedExpenseCategories[2].id, storeId: savedStores[0].id, totalAmount: 100000 },
    ];

    for (const expData of expenses) {
      const expense = dataSource.getRepository(Expense).create({
        expenseCategoryId: expData.categoryId,
        storeId: expData.storeId,
        totalAmount: expData.totalAmount,
      });
      const saved = await dataSource.getRepository(Expense).save(expense);
      const category = savedExpenseCategories.find(c => c.id === expData.categoryId)!;
      console.log(`  ✓ Created expense: ${category.name} - Rp ${saved.totalAmount.toLocaleString('id-ID')}`);
    }
    console.log('');

    // ============================================
    // STEP 14: Create Attendances
    // ============================================
    console.log('📅 Step 14: Creating Attendances...');
    
    for (const employee of savedEmployees) {
      const attendance = dataSource.getRepository(Attendance).create({
        date: today,
        employeeId: employee.id,
        status: AttendanceStatus.PRESENT,
      });
      await dataSource.getRepository(Attendance).save(attendance);
      console.log(`  ✓ Created attendance: ${employee.name} - ${attendance.status} (${attendance.date.toISOString().split('T')[0]})`);
    }
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('='.repeat(60));
    console.log('✅ DATABASE SEEDING COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Roles: ${savedRoles.length}`);
    console.log(`  • Permissions: ${savedPermissions.length}`);
    console.log(`  • Users: ${savedUsers.length}`);
    console.log(`  • Stores: ${savedStores.length}`);
    console.log(`  • Product Categories: ${savedCategories.length}`);
    console.log(`  • Products: ${savedProducts.length}`);
    console.log(`  • Product Addons: ${savedAddons.length}`);
    console.log(`  • Employees: ${savedEmployees.length}`);
    console.log(`  • Payment Methods: ${savedPaymentMethods.length}`);
    console.log(`  • Expense Categories: ${savedExpenseCategories.length}`);
    console.log(`  • Supplies: ${savedSupplies.length}`);
    console.log(`  • Weather Records: ${savedWeathers.length}`);
    console.log(`  • Production Records: ${productions.length}`);
    console.log(`  • Orders: ${savedOrders.length}`);
    console.log(`  • Transactions: ${savedOrders.length}`);
    console.log(`  • Expenses: ${expenses.length}`);
    console.log(`  • Attendances: ${savedEmployees.length}`);
    console.log('\n🔑 Test Credentials:');
    console.log('  • SuperAdmin: username=superadmin, password=superadmin123 (BYPASSES ALL AUTHORIZATION)');
    console.log('  • Owner: username=owner, password=owner123');
    console.log('  • Manager: username=manager1, password=manager123');
    console.log('  • Cashier: username=cashier1, password=cashier123');
    console.log('\n🚀 You can now start the application and test the full flow!');
    console.log('⚠️  SuperAdmin account bypasses all permission checks!');
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seed
seedDatabase();

