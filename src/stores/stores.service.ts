import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    try {
      const store = this.storeRepository.create(createStoreDto);
      return await this.storeRepository.save(store);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Store name already exists');
      }
      throw error;
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<Store>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.storeRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    return store;
  }

  async update(id: number, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);
    Object.assign(store, updateStoreDto);
    return await this.storeRepository.save(store);
  }

  async remove(id: number): Promise<void> {
    const store = await this.findOne(id);
    await this.storeRepository.softDelete(id);
  }
}

