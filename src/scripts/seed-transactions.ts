import 'dotenv/config';
import { DataSource, In, Not } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { Store } from '../entities/store.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { User } from '../users/user.entity';
import { Product } from '../entities/product.entity';
import {
  ONE_DAY_MS,
  createDateRange,
  dateWithRandomTime,
  growthAdjustedVolume,
  resolveBaseDate,
  resolveDaysBack,
} from './seed-utils/date-helpers';

const BASE_HIGH_KG = 11.5; // Okaz
const BASE_LOW_KG = 6.5; // Pabrik Es
const REVENUE_PER_KG = 500_000;
const AVG_TICKET = 25_000;
const STORE_OPEN_HOUR = 5;
const STORE_CLOSE_HOUR = 11;
function weightedPaymentMethod(cashId: number, qrisId: number): number {
  return Math.random() < 0.7 ? cashId : qrisId;
}

function randomTicket(base: number): number {
  const jitter = (Math.random() * 0.4 - 0.2) * base; // +/-20%
  const val = Math.max(10_000, Math.round(base + jitter));
  return val;
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
    const paymentRepo = dataSource.getRepository(PaymentMethod);
    const orderRepo = dataSource.getRepository(Order);
    const orderItemRepo = dataSource.getRepository(OrderItem);
    const txnRepo = dataSource.getRepository(Transaction);
    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);

    const stores = await storeRepo.find({
      where: { name: In(['Okaz', 'Pabrik Es']) },
      order: { id: 'ASC' },
    });

    const highStore = stores.find((s) => s.name === 'Okaz');
    const lowStore = stores.find((s) => s.name === 'Pabrik Es');

    if (!highStore || !lowStore) {
      throw new Error(
        'Stores Okaz and Pabrik Es are required. Run the master seeder first to create them.',
      );
    }

    const authorUser = await userRepo.findOne({
      where: { id: Not(0) },
      order: { id: 'ASC' },
    });
    if (!authorUser) {
      throw new Error(
        'At least one user is required to assign as author for transactions.',
      );
    }

    const cashPm = await paymentRepo
      .createQueryBuilder('pm')
      .where('LOWER(pm.name) LIKE :cash', { cash: '%cash%' })
      .getOne();
    const qrisPm = await paymentRepo
      .createQueryBuilder('pm')
      .where('LOWER(pm.name) LIKE :qris', { qris: '%qris%' })
      .getOne();
    if (!cashPm || !qrisPm) {
      throw new Error('Payment methods Cash and QRIS are required.');
    }

    const products = await productRepo.find({
      select: ['id'],
      order: { id: 'ASC' },
    });
    if (!products.length) {
      throw new Error('At least one product is required for order items.');
    }

    const baseDate = resolveBaseDate(process.env.SEED_BASE_DATE);
    const daysBack = resolveDaysBack(process.env.SEED_DAYS_BACK);
    const { start, end } = createDateRange(daysBack, baseDate);

    let current = new Date(start);
    let dayIndex = 0;

    while (current <= end) {
      const dateISO = current.toISOString().split('T')[0];

      const highVolume = growthAdjustedVolume(BASE_HIGH_KG, current, end);
      const lowVolume = growthAdjustedVolume(BASE_LOW_KG, current, end);

      const revenueHigh = Math.round(highVolume * REVENUE_PER_KG);
      const revenueLow = Math.round(lowVolume * REVENUE_PER_KG);

      const processStore = async (storeId: number, targetRevenue: number) => {
        const ordersToCreate: Partial<Order>[] = [];
        const itemsToCreate: Partial<OrderItem>[] = [];
        const txnsToCreate: Partial<Transaction>[] = [];

        let remaining = targetRevenue;
        const approxCount = Math.max(1, Math.round(targetRevenue / AVG_TICKET));
        for (let i = 0; i < approxCount; i++) {
          const isLast = i === approxCount - 1;
          let ticket = isLast
            ? remaining
            : Math.min(remaining, randomTicket(AVG_TICKET));
          if (ticket <= 0) ticket = AVG_TICKET;
          remaining -= ticket;

          const orderNumber = `ORD-${dateISO.replace(/-/g, '')}-${storeId}-${i + 1}`;
          const orderTime = dateWithRandomTime(
            dateISO,
            STORE_OPEN_HOUR,
            STORE_CLOSE_HOUR,
          );

          ordersToCreate.push({
            orderNumber,
            customerName: undefined,
            status: OrderStatus.PAID,
            subtotalAmount: ticket,
            taxAmount: 0,
            totalAmount: ticket,
            storeId,
            userId: authorUser.id,
            createdAt: orderTime as any,
            updatedAt: orderTime as any,
          });
        }

        const savedOrders = await orderRepo.save(ordersToCreate);

        for (const order of savedOrders) {
          const productId =
            products[Math.floor(Math.random() * products.length)].id;
          itemsToCreate.push({
            orderId: order.id,
            productId,
            unitPrice: order.totalAmount,
            quantity: 1,
            lineTotal: order.totalAmount,
          });

          const pmId = weightedPaymentMethod(cashPm.id, qrisPm.id);
          const txnNumber = `TXN-${order.orderNumber}`;
          const txnTime = new Date(
            order.createdAt ||
              dateWithRandomTime(dateISO, STORE_OPEN_HOUR, STORE_CLOSE_HOUR),
          );
          txnTime.setMinutes(
            txnTime.getMinutes() + Math.floor(Math.random() * 15),
          );
          txnsToCreate.push({
            transactionNumber: txnNumber,
            paymentMethodId: pmId,
            amount: order.totalAmount,
            status: TransactionStatus.PAID,
            authorId: authorUser.id,
            storeId,
            orderId: order.id,
            createdAt: txnTime as any,
            updatedAt: txnTime as any,
          });
        }

        await orderItemRepo.insert(itemsToCreate);
        await txnRepo.insert(txnsToCreate);
      };

      await processStore(highStore.id, revenueHigh);
      await processStore(lowStore.id, revenueLow);

      if (++dayIndex % 30 === 0) {
        console.log(`Seeded transactions up to ${dateISO}`);
      }

      current = new Date(current.getTime() + ONE_DAY_MS);
    }

    console.log('✅ seed:transactions complete');
  } catch (error) {
    console.error('❌ seed:transactions failed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap();
