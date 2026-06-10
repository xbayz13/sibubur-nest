import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { User } from '../users/user.entity';
import { Store } from '../entities/store.entity';
import { Product } from '../entities/product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { PaymentMethod } from '../entities/payment-method.entity';

// Safety: transactional seeding is dev/test only
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Transactional seed blocked in production');
  process.exit(1);
}

async function seedTransactional() {
  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    logging: true,
  });

  await dataSource.initialize();
  console.log('✅ DB connected');

  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const orderItemAddonRepo = dataSource.getRepository(OrderItemAddon);
  const txnRepo = dataSource.getRepository(Transaction);
  const userRepo = dataSource.getRepository(User);
  const storeRepo = dataSource.getRepository(Store);
  const productRepo = dataSource.getRepository(Product);
  const addonRepo = dataSource.getRepository(ProductAddon);
  const payRepo = dataSource.getRepository(PaymentMethod);

  const storeOkaz = await storeRepo.findOne({ where: { name: 'Okaz' } });
  const storePabrikes = await storeRepo.findOne({ where: { name: 'Pabrik Es' } });
  if (!storeOkaz || !storePabrikes) {
    throw new Error('Master data missing (stores). Run seed:master first.');
  }

  const cashierOkaz = await userRepo.findOne({ where: { username: 'cashier_okaz' } });
  const cashierPabrikes = await userRepo.findOne({ where: { username: 'cashier_pabrikes' } });
  if (!cashierOkaz || !cashierPabrikes) {
    throw new Error('Master data missing (cashiers). Run seed:master first.');
  }

  const products = await productRepo.find();
  const addons = await addonRepo.find();
  const paymentMethods = await payRepo.find();
  if (products.length < 2 || addons.length < 1 || paymentMethods.length < 1) {
    throw new Error('Master data incomplete (products/addons/payment methods). Run seed:master first.');
  }

  // Helper to create a simple order with one or two items and optional addon
  const createOrder = async (store: Store, user: User, useAddon: boolean) => {
    const product = products[0];
    const maybeSecond = products[1];
    const addon = addons[0];

    const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const subtotal = Number(product.price) * 2 + (useAddon ? Number(addon.price) : 0) + (maybeSecond ? Number(maybeSecond.price) : 0);
    const tax = Number((subtotal * 0.1).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    const order = await orderRepo.save(
      orderRepo.create({
        orderNumber,
        customerName: 'Walk-in Customer',
        status: OrderStatus.PAID,
        subtotalAmount: subtotal,
        taxAmount: tax,
        totalAmount: total,
        storeId: store.id,
        userId: user.id,
      }),
    );

    const itemsToSave: OrderItem[] = [];
    itemsToSave.push(
      orderItemRepo.create({
        orderId: order.id,
        productId: product.id,
        unitPrice: product.price,
        quantity: 2,
        lineTotal: Number(product.price) * 2,
      }),
    );
    if (maybeSecond) {
      itemsToSave.push(
        orderItemRepo.create({
          orderId: order.id,
          productId: maybeSecond.id,
          unitPrice: maybeSecond.price,
          quantity: 1,
          lineTotal: Number(maybeSecond.price),
        }),
      );
    }

    const savedItems = await orderItemRepo.save(itemsToSave);

    if (useAddon) {
      await orderItemAddonRepo.save(
        orderItemAddonRepo.create({
          orderItemId: savedItems[0].id,
          addonId: addon.id,
          addonPrice: addon.price,
          quantity: 1,
        }),
      );
    }

    const paymentMethod = paymentMethods[0];
    await txnRepo.save(
      txnRepo.create({
        transactionNumber: `TXN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        paymentMethodId: paymentMethod.id,
        amount: total,
        status: TransactionStatus.PAID,
        authorId: user.id,
        storeId: store.id,
        orderId: order.id,
      }),
    );
  };

  await createOrder(storeOkaz, cashierOkaz, true);
  await createOrder(storePabrikes, cashierPabrikes, false);

  console.log('✅ Transactional data seeding complete (2 sample paid orders).');
  await dataSource.destroy();
}

seedTransactional().catch((err) => {
  console.error('❌ Error running transactional seed:', err);
  process.exit(1);
});
