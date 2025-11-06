import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async assignPermissions(
    roleId: number,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RolePermission[]> {
    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Remove existing permissions for this role
    await this.rolePermissionRepository.delete({ roleId });

    // Assign new permissions
    const rolePermissions: RolePermission[] = [];

    for (const permissionId of assignPermissionsDto.permissionIds) {
      // Verify permission exists
      const permission = await this.permissionRepository.findOne({
        where: { id: permissionId },
      });
      if (!permission) {
        throw new NotFoundException(
          `Permission with ID ${permissionId} not found`,
        );
      }

      // Check if already assigned
      const existing = await this.rolePermissionRepository.findOne({
        where: { roleId, permissionId },
      });

      if (!existing) {
        const rolePermission = this.rolePermissionRepository.create({
          roleId,
          permissionId,
        });
        rolePermissions.push(
          await this.rolePermissionRepository.save(rolePermission),
        );
      }
    }

    return rolePermissions;
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  async removePermission(roleId: number, permissionId: number): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        'Permission is not assigned to this role',
      );
    }

    await this.rolePermissionRepository.delete({ roleId, permissionId });
  }

  async addPermission(roleId: number, permissionId: number): Promise<RolePermission> {
    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Verify permission exists
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if already assigned
    const existing = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (existing) {
      throw new ConflictException('Permission is already assigned to this role');
    }

    const rolePermission = this.rolePermissionRepository.create({
      roleId,
      permissionId,
    });

    return await this.rolePermissionRepository.save(rolePermission);
  }
}


