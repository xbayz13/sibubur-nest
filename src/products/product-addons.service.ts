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

  async findAll(): Promise<ProductAddon[]> {
    return await this.addonRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
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

