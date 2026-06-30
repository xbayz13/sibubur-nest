import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { BMKGService } from '../weather/bmkg.service';
import { Weather } from '../entities/weather.entity';
import { Production } from '../entities/production.entity';

const STORE_OPEN_HOUR = 5;
const STORE_CLOSE_HOUR = 11;

function dateWithRandomTime(
  dateISO: string,
  startHour: number,
  endHour: number,
): Date {
  const base = new Date(`${dateISO}T00:00:00.000Z`);
  const hour = startHour + Math.random() * Math.max(1, endHour - startHour);
  const minute = Math.floor(Math.random() * 60);
  base.setUTCHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return base;
}

async function bootstrap() {
  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ DB connected');

  try {
    const weatherRepo = dataSource.getRepository(Weather);
    const productionRepo = dataSource.getRepository(Production);
    const bmkgService = new BMKGService();

    const adm4 = process.env.WEATHER_ADM4 || '35.02.17.1015';

    // Fetch forecast once (today + tomorrow + day-after)
    const raw = await bmkgService.getWeatherForecast(adm4);

    const dayOffsets: Array<0 | 1 | 2> = [0, 1, 2];
    const weatherIdsByDate = new Map<string, number>();

    for (const offset of dayOffsets) {
      const transformed = bmkgService.transformBMKGDataForDay(raw, offset, {
        includeRaw: false,
      });
      if (!transformed) continue;

      const dateFromForecast =
        transformed.forecasts.day?.[0]?.datetime?.split(' ')[0];
      const dateISO = dateFromForecast
        ? dateFromForecast
        : new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];

      let existing = await weatherRepo.findOne({
        where: {
          date: dateISO as any,
          locationCode: transformed.location.code,
        },
      });

      if (existing) {
        existing.weatherJson = transformed as any;
        existing.locationName = transformed.location.city;
        existing.locationCode = transformed.location.code;
        // Preserve existing createdAt; update updatedAt to now
        await weatherRepo.save(existing);
        weatherIdsByDate.set(dateISO, existing.id);
      } else {
        const createdAt = dateWithRandomTime(
          dateISO,
          STORE_OPEN_HOUR,
          STORE_OPEN_HOUR + 1,
        );
        const created = await weatherRepo.save(
          weatherRepo.create({
            date: dateISO as any,
            locationName: transformed.location.city,
            locationCode: transformed.location.code,
            weatherJson: transformed as any,
            createdAt: createdAt as any,
            updatedAt: createdAt as any,
          }),
        );
        weatherIdsByDate.set(dateISO, created.id);
      }
    }

    if (weatherIdsByDate.size === 0) {
      console.log('No weather data inserted/updated (BMKG returned empty).');
      return;
    }

    // Backfill productions for these dates where weather_id is null
    for (const [dateISO, weatherId] of weatherIdsByDate.entries()) {
      const result = await productionRepo
        .createQueryBuilder()
        .update(Production)
        .set({
          weatherId,
          updatedAt: dateWithRandomTime(
            dateISO,
            STORE_OPEN_HOUR,
            STORE_CLOSE_HOUR,
          ) as any,
        })
        .where('date = :date', { date: dateISO })
        .andWhere('weather_id IS NULL')
        .execute();

      console.log(
        `Date ${dateISO}: updated ${result.affected ?? 0} productions with weatherId=${weatherId}`,
      );
    }

    console.log('✅ seed:weather complete');
  } catch (error) {
    console.error('❌ seed:weather failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap();
