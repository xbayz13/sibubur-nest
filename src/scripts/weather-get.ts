import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BMKGService } from '../weather/bmkg.service';
import { WeatherService } from '../weather/weather.service';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} Type "yes" to proceed: `);
  await rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const bmkgService = app.get(BMKGService);
  const weatherService = app.get(WeatherService);

  const adm4 = process.env.WEATHER_ADM4 || '35.02.17.1015';
  const argDate = process.argv[2];

  try {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (argDate) {
      const parsed = new Date(argDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date argument: ${argDate}`);
      }
      parsed.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (parsed.getTime() < today.getTime()) {
        const ok = await confirm(
          `Backfill from ${argDate} to today? (yes = range, no = only ${argDate})`,
        );
        if (ok) {
          startDate = parsed;
          endDate = today;
        } else {
          startDate = parsed;
          endDate = parsed;
        }
      } else if (parsed.getTime() > today.getTime()) {
        const ok = await confirm(
          `Future range from today to ${argDate}? (yes = range, no = only ${argDate})`,
        );
        if (ok) {
          startDate = today;
          endDate = parsed;
        } else {
          startDate = parsed;
          endDate = parsed;
        }
      } else {
        startDate = parsed;
        endDate = parsed;
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today;
      endDate = today;
    }

    if (!startDate || !endDate) {
      throw new Error('Date range resolution failed.');
    }

    // Cap the span to avoid excessive calls
    const maxDays = 10; // safeguard
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (diffDays > maxDays) {
      throw new Error(`Date range too large (${diffDays} days). Please shorten (max ${maxDays}).`);
    }

    let current = new Date(startDate);
    while (current <= endDate) {
      const dateISO = current.toISOString().split('T')[0];
      const raw = await bmkgService.getWeatherForecast(adm4, `${dateISO}T00:00:00.000Z`);

      // Use day offsets relative to the BMKG response
      const dayOffsets: Array<0 | 1 | 2> = [0, 1, 2];

      for (const offset of dayOffsets) {
        const transformed = bmkgService.transformBMKGDataForDay(raw, offset, { includeRaw: false });

        if (!transformed) {
          console.warn(`No forecast data for day offset ${offset} (date ${dateISO})`);
          continue;
        }

        const dateFromForecast = transformed.forecasts.day?.[0]?.datetime?.split(' ')[0];
        const date = dateFromForecast || new Date(current.getTime() + offset * 86400000)
          .toISOString()
          .split('T')[0];

        await weatherService.createOrUpdate({
          date,
          locationName: transformed.location.city,
          locationCode: transformed.location.code,
          weatherJson: transformed,
        });

        console.log(`Upserted weather for ${date} (offset ${offset})`);
      }

      current = new Date(current.getTime() + 86400000);
    }

    console.log('✅ weather:get completed');
  } catch (error) {
    console.error('❌ weather:get failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
