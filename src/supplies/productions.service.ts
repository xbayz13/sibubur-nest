import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, IsNull } from 'typeorm';
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
    // Prevent duplicate production for the same store/date
    const existing = await this.productionRepository.findOne({
      where: { storeId: createProductionDto.storeId, date: createProductionDto.date as any, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException('Production for this store and date already exists');
    }

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
          // Verify supply exists (use the transaction manager for consistency)
          const supply = await queryRunner.manager.findOne(Supply, {
            where: { id: supplyDto.supplyId },
          });

          if (!supply) {
            throw new NotFoundException(`Supply with ID ${supplyDto.supplyId} not found`);
          }

          if (supply.stock < supplyDto.quantity) {
            throw new BadRequestException(`Insufficient stock for supply ID ${supplyDto.supplyId}`);
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
    const where: any = { deletedAt: IsNull() };
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
      where: { id, deletedAt: IsNull() },
      relations: ['store', 'author', 'weather', 'productionSupplies', 'productionSupplies.supply'],
    });
    if (!production) {
      throw new NotFoundException(`Production with ID ${id} not found`);
    }
    return production;
  }

  async update(id: number, updateProductionDto: UpdateProductionDto): Promise<Production> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const production = await queryRunner.manager.findOne(Production, {
        where: { id },
        relations: ['productionSupplies'],
      });

      if (!production) {
        throw new NotFoundException(`Production with ID ${id} not found`);
      }

      // If supplies are provided, revert previous usage and apply new usage atomically
      if (updateProductionDto.supplies) {
        // Revert existing supplies
        for (const existing of production.productionSupplies) {
          const supply = await queryRunner.manager.findOne(Supply, { where: { id: existing.supplyId } });
          if (supply) {
            supply.stock += existing.quantity;
            await queryRunner.manager.save(supply);
          }
        }

        // Remove existing production supplies
        await queryRunner.manager.delete(ProductionSupply, { productionId: production.id });

        // Apply new supplies
        for (const supplyDto of updateProductionDto.supplies) {
          const supply = await queryRunner.manager.findOne(Supply, { where: { id: supplyDto.supplyId } });
          if (!supply) {
            throw new NotFoundException(`Supply with ID ${supplyDto.supplyId} not found`);
          }
          if (supply.stock < supplyDto.quantity) {
            throw new BadRequestException(`Insufficient stock for supply ID ${supplyDto.supplyId}`);
          }

          const productionSupply = queryRunner.manager.create(ProductionSupply, {
            productionId: production.id,
            supplyId: supplyDto.supplyId,
            quantity: supplyDto.quantity,
          });
          await queryRunner.manager.save(productionSupply);

          supply.stock -= supplyDto.quantity;
          await queryRunner.manager.save(supply);
        }
      }

      // Update production core fields
      Object.assign(production, {
        date: updateProductionDto.date ?? production.date,
        storeId: updateProductionDto.storeId ?? production.storeId,
        weatherId: updateProductionDto.weatherId ?? production.weatherId,
        porridgeAmount: updateProductionDto.porridgeAmount ?? production.porridgeAmount,
      });

      const saved = await queryRunner.manager.save(production);
      await queryRunner.commitTransaction();
      return this.findOne(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.productionRepository.softDelete(id);
  }
}
