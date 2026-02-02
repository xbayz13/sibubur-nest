import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, IsNull, In } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Product } from '../entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ORDER_CREATED, type OrderCreatedPayload } from '../events/order.events';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderItemAddon)
    private orderItemAddonRepository: Repository<OrderItemAddon>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generates a unique order number in format ORD-YYYYMMDD-XXXX.
   */
  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * Creates an order with items and addons. Uses batch product lookup and bulk insert.
   * @param createOrderDto - Order payload (storeId, customerName, items with productId/quantity/addons).
   * @param userId - Authenticated user id.
   * @returns Saved order with relations.
   * @throws BadRequestException if userId invalid.
   * @throws NotFoundException if any product not found or deleted.
   */
  async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new BadRequestException(`Invalid user ID: ${userId}. User authentication required.`);
    }

    const productIds = [...new Set(createOrderDto.items.map((i) => i.productId))];
    const products = await this.productRepository.find({
      where: { id: In(productIds), deletedAt: IsNull() },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotalAmount = 0;
    const itemPayloads: { product: Product; quantity: number; addons: { addonId: number; price: number; quantity: number }[]; lineTotal: number }[] = [];

    for (const itemDto of createOrderDto.items) {
      const product = productMap.get(itemDto.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${itemDto.productId} not found or has been deleted`);
      }
      let lineTotal = Number(product.price) * itemDto.quantity;
      const addons = itemDto.addons ?? [];
      for (const a of addons) {
        lineTotal += a.price * a.quantity;
      }
      subtotalAmount += lineTotal;
      itemPayloads.push({
        product,
        quantity: itemDto.quantity,
        addons: addons.map((a) => ({ addonId: a.addonId, price: a.price, quantity: a.quantity })),
        lineTotal,
      });
    }

    const taxAmount = 0;
    const totalAmount = subtotalAmount;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await this.generateOrderNumber();
      const order = queryRunner.manager.create(Order, {
        orderNumber,
        customerName: createOrderDto.customerName,
        status: OrderStatus.OPEN,
        subtotalAmount,
        taxAmount,
        totalAmount,
        storeId: createOrderDto.storeId,
        userId: Number(userId),
      });
      const savedOrder = await queryRunner.manager.save(order);

      const orderItemsToSave = itemPayloads.map((p) =>
        queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: p.product.id,
          unitPrice: p.product.price,
          quantity: p.quantity,
          lineTotal: p.lineTotal,
        }),
      );
      const savedOrderItems = (await queryRunner.manager.save(OrderItem, orderItemsToSave)) as OrderItem[];

      const addonsToSave: OrderItemAddon[] = [];
      for (let i = 0; i < itemPayloads.length; i++) {
        const orderItemId = savedOrderItems[i]!.id;
        for (const a of itemPayloads[i]!.addons) {
          addonsToSave.push(
            queryRunner.manager.create(OrderItemAddon, {
              orderItemId,
              addonId: a.addonId,
              addonPrice: a.price,
              quantity: a.quantity,
            }),
          );
        }
      }
      if (addonsToSave.length > 0) {
        await queryRunner.manager.save(OrderItemAddon, addonsToSave);
      }

      await queryRunner.commitTransaction();

      const payload: OrderCreatedPayload = {
        orderId: savedOrder.id,
        storeId: createOrderDto.storeId,
        userId: Number(userId),
        totalAmount: Number(totalAmount),
      };
      this.eventEmitter.emit(ORDER_CREATED, payload);

      return await this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lists orders optionally filtered by store and date (YYYY-MM-DD).
   */
  async findAll(storeId?: number, date?: string): Promise<Order[]> {
    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }
    if (date) {
      const dateStr = date.trim();
      const start = new Date(dateStr + 'T00:00:00.000Z');
      const end = new Date(dateStr + 'T23:59:59.999Z');
      where.createdAt = Between(start, end);
    }

    return await this.orderRepository.find({
      where,
      relations: ['store', 'user', 'orderItems', 'orderItems.product', 'orderItems.orderItemAddons', 'orderItems.orderItemAddons.addon'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds one order by id with store, user, items and addons.
   */
  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['store', 'user', 'orderItems', 'orderItems.product', 'orderItems.orderItemAddons', 'orderItems.orderItemAddons.addon'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  /**
   * Finds order by order number.
   */
  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ['store', 'user', 'orderItems', 'orderItems.product', 'orderItems.orderItemAddons', 'orderItems.orderItemAddons.addon'],
    });
    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }
    return order;
  }

  /**
   * Updates order; fails if order is already paid.
   */
  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Cannot update a paid order');
    }

    Object.assign(order, updateOrderDto);
    return await this.orderRepository.save(order);
  }

  /**
   * Cancels order; fails if order is already paid.
   */
  async cancel(id: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid order');
    }

    order.status = OrderStatus.CANCELED;
    return await this.orderRepository.save(order);
  }

  /**
   * Marks order as paid.
   */
  async markAsPaid(id: number): Promise<Order> {
    const order = await this.findOne(id);
    order.status = OrderStatus.PAID;
    return await this.orderRepository.save(order);
  }
}

