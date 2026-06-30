import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
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

  const weatherService = app.get(WeatherService);
  const keepDays = Number(process.env.KEEP_WEATHER_DAYS ?? 90);

  try {
    const ok = await confirm(
      `Are you sure you want to clean up weather data? (deduplicate + remove unused older than ${keepDays} days)`,
    );
    if (!ok) {
      console.log('Aborted. No changes made.');
      return;
    }

    const dedup = await weatherService.deduplicateWeather();
    const cleaned = await weatherService.cleanupOldWeather(keepDays);

    console.log(`Deduplicated: ${dedup}, cleaned: ${cleaned} (keepDays=${keepDays})`);
    console.log('✅ weather:cleanup completed');
  } catch (error) {
    console.error('❌ weather:cleanup failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
