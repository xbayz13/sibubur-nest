import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), GuardsModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}

