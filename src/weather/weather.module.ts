import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Weather } from '../entities/weather.entity';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { BMKGService } from './bmkg.service';

@Module({
  imports: [TypeOrmModule.forFeature([Weather])],
  providers: [WeatherService, BMKGService],
  controllers: [WeatherController],
  exports: [WeatherService, BMKGService],
})
export class WeatherModule {}


