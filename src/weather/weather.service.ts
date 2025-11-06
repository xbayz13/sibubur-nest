import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Weather } from '../entities/weather.entity';
import { CreateWeatherDto } from './dto/create-weather.dto';
import { UpdateWeatherDto } from './dto/update-weather.dto';

@Injectable()
export class WeatherService {
  constructor(
    @InjectRepository(Weather)
    private weatherRepository: Repository<Weather>,
  ) {}

  async create(createWeatherDto: CreateWeatherDto): Promise<Weather> {
    const weather = this.weatherRepository.create(createWeatherDto);
    return await this.weatherRepository.save(weather);
  }

  async findAll(): Promise<Weather[]> {
    return await this.weatherRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Weather> {
    const weather = await this.weatherRepository.findOne({
      where: { id },
    });
    if (!weather) {
      throw new NotFoundException(`Weather with ID ${id} not found`);
    }
    return weather;
  }

  async findByDate(date: string): Promise<Weather | null> {
    return await this.weatherRepository.findOne({
      where: { date: date as any },
    });
  }

  async update(id: number, updateWeatherDto: UpdateWeatherDto): Promise<Weather> {
    const weather = await this.findOne(id);
    Object.assign(weather, updateWeatherDto);
    return await this.weatherRepository.save(weather);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.weatherRepository.delete(id);
  }
}


