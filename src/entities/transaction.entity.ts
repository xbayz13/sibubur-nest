import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { User } from '../users/user.entity';
import { Store } from './store.entity';
import { Order } from './order.entity';

export enum TransactionStatus {
  CANCELED = 'canceled',
  PAID = 'paid',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'transaction_number', unique: true })
  transactionNumber: string;

  @Column({ name: 'payment_method_id' })
  paymentMethodId: number;

  @ManyToOne(() => PaymentMethod, (paymentMethod) => paymentMethod.transactions)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    enum: TransactionStatus,
    default: TransactionStatus.PAID,
  })
  status: TransactionStatus;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'store_id' })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.transactions)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.transactions)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


