import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BMKGService } from './bmkg.service';
import { WeatherService } from './weather.service';

@Injectable()
export class WeatherScheduler {
  private readonly logger = new Logger(WeatherScheduler.name);

  constructor(
    private readonly bmkgService: BMKGService,
    private readonly weatherService: WeatherService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM, {
    timeZone: 'Asia/Jakarta',
  })
  async fetchDailyWeather() {
    const adm4 = this.configService.get<string>('WEATHER_ADM4') || '35.02.17.1015';
    const keepDays = this.configService.get<number>('KEEP_WEATHER_DAYS') ?? 90;

    try {
      const raw = await this.bmkgService.getWeatherForecast(adm4);
      const transformed = this.bmkgService.transformBMKGDataForDay(raw, 0, { includeRaw: false });

      if (!transformed) {
        this.logger.warn(`Daily weather sync: no data returned for adm4=${adm4}`);
        return;
      }

      const dateFromForecast = transformed.forecasts.day?.[0]?.datetime?.split(' ')[0];
      const date = dateFromForecast || new Date().toISOString().split('T')[0];

      await this.weatherService.createOrUpdate({
        date,
        locationName: transformed.location.city,
        locationCode: transformed.location.code,
        weatherJson: transformed,
      });

      await this.weatherService.deduplicateWeather();
      await this.weatherService.cleanupOldWeather(keepDays);

      this.logger.log(`Daily weather sync done for adm4=${adm4}, date=${date}`);
    } catch (error) {
      this.logger.error(`Daily weather sync failed for adm4=${adm4}: ${error?.message || error}`);
    }
  }
}
