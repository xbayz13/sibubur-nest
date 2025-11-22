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
    // Use createOrUpdate to prevent duplicates
    return await this.createOrUpdate(createWeatherDto);
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

  /**
   * Cleanup old weather data that is not associated with any production
   * Keeps weather data for the last N days and data that has associated productions
   */
  async cleanupOldWeather(keepDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    // Find weather records older than cutoff date that are not used in productions
    const oldWeather = await this.weatherRepository
      .createQueryBuilder('weather')
      .leftJoin('weather.productions', 'production')
      .where('weather.date < :cutoffDate', { cutoffDate: cutoffDate.toISOString().split('T')[0] })
      .andWhere('production.id IS NULL')
      .getMany();

    if (oldWeather.length > 0) {
      const ids = oldWeather.map((w) => w.id);
      await this.weatherRepository.delete(ids);
    }

    return oldWeather.length;
  }

  /**
   * Deduplicate weather records - keep only one record per date
   * Keeps the most recent one if duplicates exist
   */
  async deduplicateWeather(): Promise<number> {
    // Find all weather records grouped by date
    const allWeather = await this.weatherRepository.find({
      order: { date: 'ASC', createdAt: 'DESC' },
    });

    const weatherByDate = new Map<string, Weather[]>();
    allWeather.forEach((weather) => {
      let dateKey: string;
      const dateValue = weather.date;
      if (dateValue instanceof Date) {
        dateKey = dateValue.toISOString().split('T')[0];
      } else {
        // Handle string or other types
        const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
        dateKey = dateStr.split('T')[0];
      }
      
      if (!weatherByDate.has(dateKey)) {
        weatherByDate.set(dateKey, []);
      }
      weatherByDate.get(dateKey)!.push(weather);
    });

    // Find duplicates and keep only the most recent one
    let duplicatesRemoved = 0;
    for (const [dateKey, weathers] of weatherByDate.entries()) {
      if (weathers.length > 1) {
        // Sort by createdAt DESC to get the most recent first
        weathers.sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

        // Keep the first one (most recent), delete the rest
        const toDelete = weathers.slice(1);
        const idsToDelete = toDelete.map((w) => w.id);
        
        // Check if any of these are used in productions
        for (const weather of toDelete) {
          const weatherWithProductions = await this.weatherRepository.findOne({
            where: { id: weather.id },
            relations: ['productions'],
          });
          
          // Only delete if not used in productions
          if (weatherWithProductions && weatherWithProductions.productions.length === 0) {
            await this.weatherRepository.delete(weather.id);
            duplicatesRemoved++;
          }
        }
      }
    }

    return duplicatesRemoved;
  }

  /**
   * Create or update weather - prevents duplicates
   */
  async createOrUpdate(createWeatherDto: CreateWeatherDto): Promise<Weather> {
    const existing = await this.findByDate(createWeatherDto.date);
    
    if (existing) {
      // Update existing record
      Object.assign(existing, {
        locationName: createWeatherDto.locationName,
        locationCode: createWeatherDto.locationCode,
        weatherJson: createWeatherDto.weatherJson || existing.weatherJson,
      });
      return await this.weatherRepository.save(existing);
    } else {
      // Create new record
      const weather = this.weatherRepository.create(createWeatherDto);
      const saved = await this.weatherRepository.save(weather);
      
      // Auto cleanup old weather data periodically (every 10 new records)
      // This prevents database from getting too large
      const totalWeather = await this.weatherRepository.count();
      if (totalWeather % 10 === 0) {
        // Run cleanup in background (don't await)
        this.cleanupOldWeather(90).catch(err => {
          console.error('Error during auto cleanup:', err);
        });
      }
      
      return saved;
    }
  }
}


