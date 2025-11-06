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
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
        throw new ConflictException('Permission slug already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Permission[]> {
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


