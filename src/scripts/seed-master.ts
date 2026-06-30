import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { getDatabaseConfig } from '../config/database.config';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { User } from '../users/user.entity';
import { Store } from '../entities/store.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Product } from '../entities/product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from './permissions-mapping';

// Safety: block in production unless explicitly allowed
const allowProd = process.env.ALLOW_MASTER_SEED === 'true';
if (process.env.NODE_ENV === 'production' && !allowProd) {
  console.error(
    '❌ Master seed blocked in production. Set ALLOW_MASTER_SEED=true to override.',
  );
  process.exit(1);
}

const PASSWORD = 'Pass@word123';

async function seedMaster() {
  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    logging: true,
  });

  await dataSource.initialize();
  console.log('✅ DB connected');

  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rolePermRepo = dataSource.getRepository(RolePermission);
  const userRepo = dataSource.getRepository(User);
  const storeRepo = dataSource.getRepository(Store);
  const payRepo = dataSource.getRepository(PaymentMethod);
  const expCatRepo = dataSource.getRepository(ExpenseCategory);
  const productRepo = dataSource.getRepository(Product);
  const addonRepo = dataSource.getRepository(ProductAddon);
  const addonLinkRepo = dataSource.getRepository(ProductAddonProduct);

  // Helper upsert by unique name
  const upsertByName = async <T extends { name: string }>(
    repo: any,
    rows: T[],
  ): Promise<any[]> => {
    const results: any[] = [];
    for (const row of rows) {
      let entity = await repo.findOne({ where: { name: row.name } });
      if (!entity) {
        entity = repo.create(row);
      } else {
        Object.assign(entity, row);
      }
      results.push(await repo.save(entity));
    }
    return results;
  };

  // Roles (include Manager for store-level managers)
  const roles = await upsertByName(roleRepo, [
    { name: 'SuperAdmin' },
    { name: 'Owner' },
    { name: 'Manager' },
    { name: 'Cashier' },
  ]);

  // Permissions
  const perms = await Promise.all(
    ALL_PERMISSIONS.map(async (perm) => {
      let entity = await permRepo.findOne({ where: { slug: perm.slug } });
      if (!entity) entity = permRepo.create(perm);
      else Object.assign(entity, perm);
      return permRepo.save(entity);
    }),
  );
  const permMap = new Map(perms.map((p: any) => [p.slug, p]));

  // Role-permission mapping
  for (const [roleName, permissionSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const role: any = (roles as any[]).find((r) => r.name === roleName);
    if (!role) continue;
    for (const slug of permissionSlugs) {
      const perm: any = permMap.get(slug);
      if (!perm) continue;
      const existing = await rolePermRepo.findOne({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!existing) {
        const rp = rolePermRepo.create({
          roleId: role.id,
          permissionId: perm.id,
        });
        await rolePermRepo.save(rp);
      }
    }
  }

  // Payment Methods
  await upsertByName(payRepo, [{ name: 'Cash' }, { name: 'QRIS' }]);

  // Expense Categories
  await upsertByName(expCatRepo, [
    { name: 'Bahan Baku' },
    { name: 'Operasional' },
    { name: 'Transportasi' },
    { name: 'Lain-lain' },
  ]);

  // Stores
  const stores = await upsertByName(storeRepo, [
    { name: 'Okaz' },
    { name: 'Pabrik Es' },
  ]);
  const storeMap = new Map((stores as any[]).map((s) => [s.name, s]));

  // Products (prices in Rupiah)
  const products = await upsertByName(productRepo, [
    { name: 'Bubur Ayam', price: 10000, description: 'Bubur ayam lengkap' },
    { name: 'Bubur Polos', price: 8000, description: 'Bubur tanpa topping' },
    { name: 'Es Jeruk', price: 5000 },
    { name: 'Es Teh', price: 3000 },
    { name: 'Jeruk Hangat', price: 5000 },
    { name: 'Teh Hangat', price: 3000 },
    { name: 'Aqua Gelas', price: 1000 },
    { name: 'Kopi', price: 5000 },
    { name: 'Susu Hangat', price: 5000 },
    { name: 'Es Susu', price: 5000 },
  ]);
  const productMap = new Map((products as any[]).map((p) => [p.name, p]));

  // Addons (prices in Rupiah)
  const addons = await upsertByName(addonRepo, [
    { name: 'Sate Jeroan', price: 1500 },
    { name: 'Sate Telur', price: 3000 },
    { name: 'Telur Asin', price: 3000 },
    { name: 'Kacang', price: 1000 },
  ]);
  const addonMap = new Map((addons as any[]).map((a) => [a.name, a]));

  // Link all addons to both Bubur Ayam and Bubur Polos
  const productsForAddons = ['Bubur Ayam', 'Bubur Polos'];
  for (const productName of productsForAddons) {
    const prod: any = productMap.get(productName);
    if (!prod) continue;
    for (const addon of addons as any[]) {
      const existing = await addonLinkRepo.findOne({
        where: { productId: prod.id, addonId: addon.id },
      });
      if (!existing) {
        await addonLinkRepo.save(
          addonLinkRepo.create({ productId: prod.id, addonId: addon.id }),
        );
      }
    }
  }

  // Users
  const rolesByName = new Map((roles as any[]).map((r) => [r.name, r]));
  const hash = await bcrypt.hash(PASSWORD, 10);
  const usersToCreate = [
    {
      username: 'superadmin',
      name: 'Super Admin',
      role: 'SuperAdmin',
      store: null,
    },
    {
      username: 'owner',
      name: 'Owner',
      role: 'Owner',
      store: storeMap.get('Okaz')?.id ?? null,
    },
    {
      username: 'manager_okaz',
      name: 'Manager Okaz',
      role: 'Manager',
      store: storeMap.get('Okaz')?.id ?? null,
    },
    {
      username: 'manager_pabrikes',
      name: 'Manager Pabrik Es',
      role: 'Manager',
      store: storeMap.get('Pabrik Es')?.id ?? null,
    },
    {
      username: 'cashier_okaz',
      name: 'Cashier Okaz',
      role: 'Cashier',
      store: storeMap.get('Okaz')?.id ?? null,
    },
    {
      username: 'cashier_pabrikes',
      name: 'Cashier Pabrik Es',
      role: 'Cashier',
      store: storeMap.get('Pabrik Es')?.id ?? null,
    },
  ];

  for (const u of usersToCreate) {
    const role: any = rolesByName.get(u.role);
    if (!role) continue;
    let user = await userRepo.findOne({ where: { username: u.username } });
    if (!user) {
      user = userRepo.create({
        username: u.username,
        name: u.name,
        passwordHash: hash,
        roleId: role.id,
        storeId: u.store,
      });
    } else {
      Object.assign(user, {
        name: u.name,
        passwordHash: hash,
        roleId: role.id,
        storeId: u.store,
      });
    }
    await userRepo.save(user);
  }

  console.log('\n✅ Master data seeding complete.');
  console.log('Users/password: Pass@word123');
  console.log('Stores: Okaz, Pabrik Es');
  console.log('Products:', Array.from(productMap.keys()).join(', '));
  console.log('Addons:', Array.from(addonMap.keys()).join(', '));

  await dataSource.destroy();
}

seedMaster().catch((err) => {
  console.error('❌ Error running master seed:', err);
  process.exit(1);
});
