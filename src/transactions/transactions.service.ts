import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async generateTransactionNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN-${dateStr}-${random}`;
  }

  async create(createTransactionDto: CreateTransactionDto, authorId: number): Promise<Transaction> {
    // Verify order exists and is not already paid
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

    // Mark order as paid
    order.status = OrderStatus.PAID;
    await this.orderRepository.save(order);

    return await this.findOne(savedTransaction.id);
  }

  async findAll(storeId?: number): Promise<Transaction[]> {
    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }

    return await this.transactionRepository.find({
      where,
      relations: ['paymentMethod', 'author', 'store', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

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

