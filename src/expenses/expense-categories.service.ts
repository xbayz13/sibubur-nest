import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private categoryRepository: Repository<ExpenseCategory>,
  ) {}

  async create(createCategoryDto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    try {
      const category = this.categoryRepository.create(createCategoryDto);
      return await this.categoryRepository.save(category);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<ExpenseCategory>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.categoryRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<ExpenseCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateExpenseCategoryDto): Promise<ExpenseCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.categoryRepository.softDelete(id);
  }
}

