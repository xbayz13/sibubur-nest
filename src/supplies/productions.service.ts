import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Production } from '../entities/production.entity';
import { ProductionSupply } from '../entities/production-supply.entity';
import { Supply } from '../entities/supply.entity';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductionsService {
  constructor(
    @InjectRepository(Production)
    private productionRepository: Repository<Production>,
    @InjectRepository(ProductionSupply)
    private productionSupplyRepository: Repository<ProductionSupply>,
    @InjectRepository(Supply)
    private supplyRepository: Repository<Supply>,
    private dataSource: DataSource,
  ) {}

  async create(createProductionDto: CreateProductionDto, authorId: number): Promise<Production> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const production = queryRunner.manager.create(Production, {
        ...createProductionDto,
        authorId,
      });

      const savedProduction = await queryRunner.manager.save(production);

      // Create production supplies
      if (createProductionDto.supplies && createProductionDto.supplies.length > 0) {
        for (const supplyDto of createProductionDto.supplies) {
          // Verify supply exists
          const supply = await this.supplyRepository.findOne({
            where: { id: supplyDto.supplyId },
          });

          if (!supply) {
            throw new NotFoundException(`Supply with ID ${supplyDto.supplyId} not found`);
          }

          const productionSupply = queryRunner.manager.create(ProductionSupply, {
            productionId: savedProduction.id,
            supplyId: supplyDto.supplyId,
            quantity: supplyDto.quantity,
          });

          await queryRunner.manager.save(productionSupply);

          // Update supply stock
          supply.stock -= supplyDto.quantity;
          await queryRunner.manager.save(supply);
        }
      }

      await queryRunner.commitTransaction();

      return await this.findOne(savedProduction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    storeId?: number,
    date?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Production>> {
    const where: any = {};
    if (storeId) {
      where.storeId = storeId;
    }
    if (date) {
      where.date = date as any;
    }
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.productionRepository.findAndCount({
      where,
      relations: ['store', 'author', 'weather', 'productionSupplies', 'productionSupplies.supply'],
      order: { date: 'DESC', createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<Production> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ['store', 'author', 'weather', 'productionSupplies', 'productionSupplies.supply'],
    });
    if (!production) {
      throw new NotFoundException(`Production with ID ${id} not found`);
    }
    return production;
  }

  async update(id: number, updateProductionDto: UpdateProductionDto): Promise<Production> {
    const production = await this.findOne(id);
    Object.assign(production, updateProductionDto);
    return await this.productionRepository.save(production);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.productionRepository.delete(id);
  }
}


