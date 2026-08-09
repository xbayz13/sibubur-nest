import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ORDER_PAID, type OrderPaidPayload } from '../events/order.events';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generates a unique transaction number in format TXN-YYYYMMDD-XXXX.
   */
  /**
   * Generates a unique transaction number in format TXN-YYYYMMDD-XXXX.
   * Retries up to maxAttempts to avoid collisions.
   */
  async generateTransactionNumber(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      const candidate = `TXN-${dateStr}-${random}`;

      const existing = await this.transactionRepository.findOne({
        where: { transactionNumber: candidate },
      });
      if (!existing) return candidate;

      // Soft warn and retry
    }

    throw new BadRequestException(
      'Could not generate unique transaction number. Please retry.',
    );
  }

  /**
   * Creates a paid transaction and marks the order as paid. Emits ORDER_PAID event.
   * Wrapped in a database transaction for consistency.
   */
  async create(
    createTransactionDto: CreateTransactionDto,
    authorId: number,
  ): Promise<Transaction> {
    const order = await this.orderRepository.findOne({
      where: { id: createTransactionDto.orderId },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${createTransactionDto.orderId} not found`,
      );
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    // Server-side integrity check: the amount paid must cover the order total.
    // Overpayment is allowed (cash with change); underpayment is rejected.
    if (Number(createTransactionDto.amount) < Number(order.totalAmount)) {
      throw new BadRequestException(
        `Amount is less than order total: expected at least ${order.totalAmount}`,
      );
    }

    const transactionNumber = await this.generateTransactionNumber();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(Transaction, {
        transactionNumber,
        paymentMethodId: createTransactionDto.paymentMethodId,
        amount: createTransactionDto.amount,
        status: TransactionStatus.PAID,
        authorId,
        storeId: createTransactionDto.storeId,
        orderId: createTransactionDto.orderId,
      });
      const savedTransaction = await queryRunner.manager.save(
        Transaction,
        transaction,
      );

      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      const payload: OrderPaidPayload = {
        orderId: createTransactionDto.orderId,
        transactionId: savedTransaction.id,
        amount: Number(createTransactionDto.amount),
        storeId: createTransactionDto.storeId,
      };
      this.eventEmitter.emit(ORDER_PAID, payload);

      return await this.findOne(savedTransaction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lists transactions optionally filtered by store and date (YYYY-MM-DD), with pagination.
   */
  async findAll(
    storeId?: number,
    date?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Transaction>> {
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
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      relations: ['paymentMethod', 'author', 'store', 'order'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
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
