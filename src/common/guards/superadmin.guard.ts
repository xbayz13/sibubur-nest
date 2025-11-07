import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roleId) {
      return false;
    }

    // Check if user has SuperAdmin role
    const role = await this.roleRepository.findOne({
      where: { id: user.roleId },
    });

    return role?.name === 'SuperAdmin';
  }
}

