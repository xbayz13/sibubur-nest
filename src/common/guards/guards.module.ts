import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../entities/role.entity';
import { SuperAdminGuard } from './superadmin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [SuperAdminGuard],
  // Export the guard and the Role repository binding so downstream modules can resolve it
  exports: [SuperAdminGuard, TypeOrmModule],
})
export class GuardsModule {}
