import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Default deny: any route without an explicit @RequirePermission is blocked.
    if (!required) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { id?: number; roleId?: number };
    }>();
    const user = request.user;

    if (!user || !user.roleId) {
      return false;
    }

    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      return false;
    }

    // Owner and SuperAdmin have access to every permission.
    if (role.name === 'SuperAdmin' || role.name === 'Owner') {
      return true;
    }

    return role.rolePermissions.some((rp) => rp.permission?.slug === required);
  }
}
