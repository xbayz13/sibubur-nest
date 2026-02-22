import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProductAddon } from '../entities/product-addon.entity';
import { CreateProductAddonDto } from './dto/create-product-addon.dto';
import { UpdateProductAddonDto } from './dto/update-product-addon.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductAddonsService {
  constructor(
    @InjectRepository(ProductAddon)
    private addonRepository: Repository<ProductAddon>,
  ) {}

  async create(createAddonDto: CreateProductAddonDto): Promise<ProductAddon> {
    try {
      const addon = this.addonRepository.create(createAddonDto);
      return await this.addonRepository.save(addon);
    } catch (error) {
      throw new ConflictException('Failed to create addon');
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<ProductAddon>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.addonRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<ProductAddon> {
    const addon = await this.addonRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!addon) {
      throw new NotFoundException(`Addon with ID ${id} not found`);
    }
    return addon;
  }

  async update(id: number, updateAddonDto: UpdateProductAddonDto): Promise<ProductAddon> {
    const addon = await this.findOne(id);
    Object.assign(addon, updateAddonDto);
    return await this.addonRepository.save(addon);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.addonRepository.softDelete(id);
  }
}

