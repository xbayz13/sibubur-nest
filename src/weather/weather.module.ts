import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Weather } from '../entities/weather.entity';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { BMKGService } from './bmkg.service';
import { WeatherScheduler } from './weather.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Weather])],
  providers: [WeatherService, BMKGService, WeatherScheduler],
  controllers: [WeatherController],
  exports: [WeatherService, BMKGService],
})
export class WeatherModule {}

