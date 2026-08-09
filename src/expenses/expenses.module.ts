import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseCategory]), GuardsModule],
  providers: [ExpensesService, ExpenseCategoriesService],
  controllers: [ExpensesController, ExpenseCategoriesController],
  exports: [ExpensesService, ExpenseCategoriesService],
})
export class ExpensesModule {}
