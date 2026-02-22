import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const role = this.roleRepository.create(createRoleDto);
      return await this.roleRepository.save(role);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Role name already exists');
      }
      throw error;
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<Role>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.roleRepository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['users', 'rolePermissions', 'rolePermissions.permission'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['users', 'rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.roleRepository.softDelete(id);
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name, deletedAt: IsNull() },
    });
  }
}


