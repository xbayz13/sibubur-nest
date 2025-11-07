import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepository.create(createExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  async findAll(storeId?: number, date?: string): Promise<Expense[]> {
    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }

    // Add date filtering
    if (date) {
      // Parse date string (YYYY-MM-DD) and create date range
      // Use UTC to avoid timezone issues
      const dateStr = date.trim();
      const start = new Date(dateStr + 'T00:00:00.000Z');
      const end = new Date(dateStr + 'T23:59:59.999Z');
      
      where.createdAt = Between(start, end);
    }

    return await this.expenseRepository.find({
      where,
      relations: ['category', 'store'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['category', 'store'],
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  async update(id: number, updateExpenseDto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);
    Object.assign(expense, updateExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.expenseRepository.delete(id);
  }
}


