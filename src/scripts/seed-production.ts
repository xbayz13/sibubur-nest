import { DataSource } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from './permissions-mapping';
import { getDatabaseConfig } from '../config/database.config';

/**
 * Production Seeder - Safe seeder for production environment
 * 
 * This seeder:
 * - Only creates essential master data (roles, permissions, payment methods, expense categories)
 * - Does NOT delete existing data
 * - Does NOT create users with default passwords
 * - Does NOT create dummy data (stores, products, etc.)
 * - Only creates data if it doesn't exist (idempotent)
 */
async function seedProduction() {
  // SAFETY: Only run in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ ERROR: This seeder is only for production environment!');
    console.error('   For development, use: npm run seed');
    process.exit(1);
  }

  console.log('\n⚠️  PRODUCTION SEEDER');
  console.log('   This will create essential master data ONLY.');
  console.log('   It will NOT delete existing data.');
  console.log('   It will NOT create users.');
  console.log('   Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  const dbConfig = getDatabaseConfig();
  const dataSource = new DataSource({
    type: (dbConfig as any).type || 'postgres',
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
    console.log('✅ Database connected\n');

    // ============================================
    // STEP 1: Create Roles (only if not exists)
    // ============================================
    console.log('📋 Step 1: Creating Roles (if not exists)...');
    
    const roles = [
      { name: 'SuperAdmin' },
      { name: 'Owner' },
      { name: 'Manager' },
      { name: 'Cashier' },
      { name: 'Kitchen Staff' },
    ];

    const savedRoles: Role[] = [];
    for (const roleData of roles) {
      let role = await dataSource.getRepository(Role).findOne({ 
        where: { name: roleData.name } 
      });
      
      if (!role) {
        role = dataSource.getRepository(Role).create(roleData);
        role = await dataSource.getRepository(Role).save(role);
        console.log(`  ✓ Created role: ${role.name}`);
      } else {
        console.log(`  ⊙ Role already exists: ${role.name}`);
      }
      savedRoles.push(role);
    }
    console.log('');

    // ============================================
    // STEP 2: Create Permissions (only if not exists)
    // ============================================
    console.log('🔐 Step 2: Creating Permissions (if not exists)...');
    
    const savedPermissions: Permission[] = [];
    const permissionMap = new Map<string, Permission>();

    for (const permData of ALL_PERMISSIONS) {
      let permission = await dataSource.getRepository(Permission).findOne({ 
        where: { slug: permData.slug } 
      });
      
      if (!permission) {
        permission = dataSource.getRepository(Permission).create(permData);
        permission = await dataSource.getRepository(Permission).save(permission);
        console.log(`  ✓ Created permission: ${permission.slug}`);
      } else {
        console.log(`  ⊙ Permission already exists: ${permission.slug}`);
      }
      savedPermissions.push(permission);
      permissionMap.set(permission.slug, permission);
    }
    console.log(`\n  ✓ Total permissions: ${savedPermissions.length}\n`);

    // ============================================
    // STEP 3: Assign Permissions to Roles (only if not exists)
    // ============================================
    console.log('🔗 Step 3: Assigning Permissions to Roles (if not exists)...');
    
    for (const [roleName, permissionSlugs] of Object.entries(ROLE_PERMISSIONS)) {
      const role = savedRoles.find(r => r.name === roleName);
      if (!role) {
        console.log(`  ⚠️  Role ${roleName} not found, skipping permission assignment`);
        continue;
      }

      let assignedCount = 0;
      let skippedCount = 0;
      
      for (const slug of permissionSlugs) {
        const permission = permissionMap.get(slug);
        if (!permission) {
          console.log(`  ⚠️  Permission ${slug} not found, skipping`);
          continue;
        }

        // Check if role-permission already exists
        const existing = await dataSource.getRepository(RolePermission).findOne({
          where: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });

        if (!existing) {
          const rolePermission = dataSource.getRepository(RolePermission).create({
            roleId: role.id,
            permissionId: permission.id,
          });
          await dataSource.getRepository(RolePermission).save(rolePermission);
          assignedCount++;
        } else {
          skippedCount++;
        }
      }
      
      if (assignedCount > 0) {
        console.log(`  ✓ Assigned ${assignedCount} new permissions to ${roleName} role`);
      }
      if (skippedCount > 0) {
        console.log(`  ⊙ ${skippedCount} permissions already assigned to ${roleName} role`);
      }
    }
    console.log('');

    // ============================================
    // STEP 4: Create Payment Methods (only if not exists)
    // ============================================
    console.log('💳 Step 4: Creating Payment Methods (if not exists)...');
    
    const paymentMethods = [
      { name: 'Cash' },
      { name: 'QRIS' },
    ];

    for (const pmData of paymentMethods) {
      let pm = await dataSource.getRepository(PaymentMethod).findOne({ 
        where: { name: pmData.name } 
      });
      
      if (!pm) {
        pm = dataSource.getRepository(PaymentMethod).create(pmData);
        pm = await dataSource.getRepository(PaymentMethod).save(pm);
        console.log(`  ✓ Created payment method: ${pm.name}`);
      } else {
        console.log(`  ⊙ Payment method already exists: ${pm.name}`);
      }
    }
    console.log('');

    // ============================================
    // STEP 5: Create Expense Categories (only if not exists)
    // ============================================
    console.log('💰 Step 5: Creating Expense Categories (if not exists)...');
    
    const expenseCategories = [
      { name: 'Bahan Baku' },
      { name: 'Operasional' },
      { name: 'Transportasi' },
      { name: 'Lain-lain' },
    ];

    for (const ecData of expenseCategories) {
      let ec = await dataSource.getRepository(ExpenseCategory).findOne({ 
        where: { name: ecData.name } 
      });
      
      if (!ec) {
        ec = dataSource.getRepository(ExpenseCategory).create(ecData);
        ec = await dataSource.getRepository(ExpenseCategory).save(ec);
        console.log(`  ✓ Created expense category: ${ec.name}`);
      } else {
        console.log(`  ⊙ Expense category already exists: ${ec.name}`);
      }
    }
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('='.repeat(60));
    console.log('✅ PRODUCTION SEEDING COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Roles: ${savedRoles.length}`);
    console.log(`  • Permissions: ${savedPermissions.length}`);
    console.log(`  • Payment Methods: ${paymentMethods.length}`);
    console.log(`  • Expense Categories: ${expenseCategories.length}`);
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Create admin user: npm run create-admin');
    console.log('   2. Create stores, products, employees via API or admin panel');
    console.log('   3. Never run development seeder (npm run seed) in production!');
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seed
seedProduction();

