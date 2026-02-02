import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ORDER_PAID, type OrderPaidPayload } from '../events/order.events';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generates a unique transaction number in format TXN-YYYYMMDD-XXXX.
   */
  async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN-${dateStr}-${random}`;
  }

  /**
   * Creates a paid transaction and marks the order as paid. Emits ORDER_PAID event.
   */
  async create(createTransactionDto: CreateTransactionDto, authorId: number): Promise<Transaction> {
    const order = await this.orderRepository.findOne({
      where: { id: createTransactionDto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${createTransactionDto.orderId} not found`);
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const transactionNumber = await this.generateTransactionNumber();

    const transaction = this.transactionRepository.create({
      transactionNumber,
      paymentMethodId: createTransactionDto.paymentMethodId,
      amount: createTransactionDto.amount,
      status: TransactionStatus.PAID,
      authorId,
      storeId: createTransactionDto.storeId,
      orderId: createTransactionDto.orderId,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    const payload: OrderPaidPayload = {
      orderId: createTransactionDto.orderId,
      transactionId: savedTransaction.id,
      amount: Number(createTransactionDto.amount),
      storeId: createTransactionDto.storeId,
    };
    this.eventEmitter.emit(ORDER_PAID, payload);

    return await this.findOne(savedTransaction.id);
  }

  /**
   * Lists transactions optionally filtered by store and date (YYYY-MM-DD).
   */
  async findAll(storeId?: number, date?: string): Promise<Transaction[]> {
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
    return await this.transactionRepository.find({
      where,
      relations: ['paymentMethod', 'author', 'store', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds one transaction by id with relations.
   */
  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['paymentMethod', 'author', 'store', 'order'],
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return transaction;
  }
}

