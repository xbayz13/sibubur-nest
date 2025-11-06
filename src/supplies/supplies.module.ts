import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supply } from '../entities/supply.entity';
import { Production } from '../entities/production.entity';
import { ProductionSupply } from '../entities/production-supply.entity';
import { Weather } from '../entities/weather.entity';
import { SuppliesService } from './supplies.service';
import { SuppliesController } from './supplies.controller';
import { ProductionsService } from './productions.service';
import { ProductionsController } from './productions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supply, Production, ProductionSupply, Weather]),
  ],
  providers: [SuppliesService, ProductionsService],
  controllers: [SuppliesController, ProductionsController],
  exports: [SuppliesService, ProductionsService],
})
export class SuppliesModule {}


