import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Supply } from '../entities/supply.entity';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';

@Injectable()
export class SuppliesService {
  constructor(
    @InjectRepository(Supply)
    private supplyRepository: Repository<Supply>,
  ) {}

  async create(createSupplyDto: CreateSupplyDto): Promise<Supply> {
    const supply = this.supplyRepository.create(createSupplyDto);
    return await this.supplyRepository.save(supply);
  }

  async findAll(): Promise<Supply[]> {
    return await this.supplyRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Supply> {
    const supply = await this.supplyRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!supply) {
      throw new NotFoundException(`Supply with ID ${id} not found`);
    }
    return supply;
  }

  async update(id: number, updateSupplyDto: UpdateSupplyDto): Promise<Supply> {
    const supply = await this.findOne(id);
    Object.assign(supply, updateSupplyDto);
    return await this.supplyRepository.save(supply);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.supplyRepository.softDelete(id);
  }

  async getLowStockSupplies(): Promise<Supply[]> {
    return await this.supplyRepository
      .createQueryBuilder('supply')
      .where('supply.stock <= supply.min_stock')
      .andWhere('supply.deleted_at IS NULL')
      .getMany();
  }

  async restock(id: number, quantity: number): Promise<Supply> {
    const supply = await this.findOne(id);
    supply.stock += quantity;
    return await this.supplyRepository.save(supply);
  }
}

