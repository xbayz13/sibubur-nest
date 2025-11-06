import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseCategory } from './expense-category.entity';
import { Store } from './store.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'expense_category_id' })
  expenseCategoryId: number;

  @ManyToOne(() => ExpenseCategory, (category) => category.expenses)
  @JoinColumn({ name: 'expense_category_id' })
  category: ExpenseCategory;

  @Column({ name: 'store_id' })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.expenses)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


