import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../entities/role.entity';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [PermissionGuard],
  // Export the guard and the Role repository binding so downstream modules can resolve it
  exports: [PermissionGuard, TypeOrmModule],
})
export class GuardsModule {}
