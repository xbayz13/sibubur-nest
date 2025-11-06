import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';
import { Transaction } from './transaction.entity';
import { Production } from './production.entity';
import { Expense } from './expense.entity';
import { Employee } from './employee.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Order, (order) => order.store)
  orders: Order[];

  @OneToMany(() => Transaction, (transaction) => transaction.store)
  transactions: Transaction[];

  @OneToMany(() => Production, (production) => production.store)
  productions: Production[];

  @OneToMany(() => Expense, (expense) => expense.store)
  expenses: Expense[];

  @OneToMany(() => Employee, (employee) => employee.store)
  employees: Employee[];
}


