import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Product } from '../entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
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
  ) {}

  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  }

  async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await this.generateOrderNumber();
      
      let subtotalAmount = 0;
      const orderItems: OrderItem[] = [];

      // Calculate totals
      for (const itemDto of createOrderDto.items) {
        const product = await this.productRepository.findOne({
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);
        }

        let itemTotal = product.price * itemDto.quantity;
        
        // Calculate addons
        if (itemDto.addons && itemDto.addons.length > 0) {
          for (const addonDto of itemDto.addons) {
            itemTotal += addonDto.price * addonDto.quantity;
          }
        }

        subtotalAmount += itemTotal;
      }

      const taxAmount = subtotalAmount * 0.1; // 10% tax
      const totalAmount = subtotalAmount + taxAmount;

      const order = queryRunner.manager.create(Order, {
        orderNumber,
        customerName: createOrderDto.customerName,
        status: OrderStatus.OPEN,
        subtotalAmount,
        taxAmount,
        totalAmount,
        storeId: createOrderDto.storeId,
        userId,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      for (const itemDto of createOrderDto.items) {
        const product = await this.productRepository.findOne({
          where: { id: itemDto.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);
        }

        let lineTotal = product.price * itemDto.quantity;
        
        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: itemDto.productId,
          unitPrice: product.price,
          quantity: itemDto.quantity,
          lineTotal,
        });

        const savedOrderItem = await queryRunner.manager.save(orderItem);

        // Create order item addons
        if (itemDto.addons && itemDto.addons.length > 0) {
          for (const addonDto of itemDto.addons) {
            const orderItemAddon = queryRunner.manager.create(OrderItemAddon, {
              orderItemId: savedOrderItem.id,
              addonId: addonDto.addonId,
              addonPrice: addonDto.price,
              quantity: addonDto.quantity,
            });

            await queryRunner.manager.save(orderItemAddon);
            lineTotal += addonDto.price * addonDto.quantity;
          }

          // Update line total with addons
          savedOrderItem.lineTotal = lineTotal;
          await queryRunner.manager.save(savedOrderItem);
        }
      }

      await queryRunner.commitTransaction();

      return await this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(storeId?: number): Promise<Order[]> {
    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }

    return await this.orderRepository.find({
      where,
      relations: ['store', 'user', 'orderItems', 'orderItems.product', 'orderItems.orderItemAddons', 'orderItems.orderItemAddons.addon'],
      order: { createdAt: 'DESC' },
    });
  }

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

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Cannot update a paid order');
    }

    Object.assign(order, updateOrderDto);
    return await this.orderRepository.save(order);
  }

  async cancel(id: number): Promise<Order> {
    const order = await this.findOne(id);
    
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid order');
    }

    order.status = OrderStatus.CANCELED;
    return await this.orderRepository.save(order);
  }

  async markAsPaid(id: number): Promise<Order> {
    const order = await this.findOne(id);
    order.status = OrderStatus.PAID;
    return await this.orderRepository.save(order);
  }
}

