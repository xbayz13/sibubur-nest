import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    try {
      const permission = this.permissionRepository.create(createPermissionDto);
      return await this.permissionRepository.save(permission);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Permission slug already exists');
      }
      throw error;
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<Permission>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.permissionRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { module: 'ASC', action: 'ASC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  /**
   * Returns all permissions without pagination. For internal use (e.g. Owner role "all permissions").
   */
  async findAllUnpaginated(): Promise<Permission[]> {
    return await this.permissionRepository.find({
      where: { deletedAt: IsNull() },
      order: { module: 'ASC', action: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['rolePermissions', 'rolePermissions.role'],
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({
      where: { slug, deletedAt: IsNull() },
    });
  }

  async findByModule(module: string): Promise<Permission[]> {
    return await this.permissionRepository.find({
      where: { module, deletedAt: IsNull() },
      order: { action: 'ASC' },
    });
  }

  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(id);
    Object.assign(permission, updatePermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.permissionRepository.softDelete(id);
  }
}


