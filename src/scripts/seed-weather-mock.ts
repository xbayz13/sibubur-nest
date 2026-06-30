import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { Weather } from '../entities/weather.entity';
import { Production } from '../entities/production.entity';

const ADM4_CODE = process.env.WEATHER_ADM4 || '35.02.17.1015';
const LOCATION_NAME = 'Ponorogo';
const DAYS = 365; // past 1 year up to yesterday
const SEED_HOUR_UTC = 5; // 05:00:00

// BMKG terms (Bahasa)
const CONDITIONS = [
  'Cerah',
  'Cerah Berawan',
  'Berawan',
  'Berawan Tebal',
  'Hujan Ringan',
  'Hujan Sedang',
  'Hujan Lebat',
  'Hujan Petir',
] as const;

type Condition = (typeof CONDITIONS)[number];

const ONE_DAY_MS = 86400000;

const HOLIDAYS = new Set<string>([
  // Add key Indonesian holidays within the last year window as needed
  '2025-12-25',
  '2026-01-01',
  '2026-02-10',
  '2026-03-12',
  '2026-03-29',
  '2026-04-10',
  '2026-04-11',
  '2026-05-01',
  '2026-05-14',
  '2026-05-25',
]);

function isWeekendOrHoliday(date: Date): boolean {
  const day = date.getDay();
  const iso = date.toISOString().split('T')[0];
  return day === 0 || day === 6 || HOLIDAYS.has(iso);
}

function pickCondition(date: Date): Condition {
  const m = date.getMonth() + 1; // 1-12
  const rnd = Math.random();

  const rainy = [11, 12, 1, 2, 3, 4].includes(m);
  const peakRain = m === 1 || m === 2;
  const peakDry = m === 8;

  if (rainy) {
    // Base rainy weights (65-70% rain/very cloudy)
    let w = {
      clear: 0.10,
      partly: 0.15,
      cloudy: 0.10,
      thick: 0.20,
      rainLight: 0.18,
      rainMed: 0.15,
      rainHeavy: 0.08,
      thunder: 0.04,
    };
    if (peakRain) {
      // More rain Jan-Feb
      w = {
        clear: 0.05,
        partly: 0.10,
        cloudy: 0.10,
        thick: 0.20,
        rainLight: 0.22,
        rainMed: 0.18,
        rainHeavy: 0.10,
        thunder: 0.05,
      };
    }
    return choose(rnd, w);
  } else {
    // Dry season (85-90% clear/partly)
    let w = {
      clear: 0.45,
      partly: 0.40,
      cloudy: 0.08,
      thick: 0.02,
      rainLight: 0.02,
      rainMed: 0.02,
      rainHeavy: 0.005,
      thunder: 0.005,
    };
    if (peakDry) {
      // Extra clear in August
      w.clear = 0.55;
      w.partly = 0.35;
    }
    return choose(rnd, w);
  }
}

function choose(rnd: number, w: Record<string, number>): Condition {
  const ordered: Array<[Condition, number]> = [
    ['Cerah', w.clear],
    ['Cerah Berawan', w.partly],
    ['Berawan', w.cloudy],
    ['Berawan Tebal', w.thick],
    ['Hujan Ringan', w.rainLight],
    ['Hujan Sedang', w.rainMed],
    ['Hujan Lebat', w.rainHeavy],
    ['Hujan Petir', w.thunder],
  ];
  let acc = 0;
  for (const [cond, prob] of ordered) {
    acc += prob;
    if (rnd <= acc) return cond;
  }
  return 'Cerah Berawan';
}

function atFiveUTC(dateISO: string): Date {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCHours(SEED_HOUR_UTC, 0, 0, 0);
  return d;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today.getTime() - ONE_DAY_MS); // yesterday
    const start = new Date(end.getTime() - (DAYS - 1) * ONE_DAY_MS);

    let cur = new Date(start);
    const batch: Weather[] = [];

    while (cur <= end) {
      const iso = cur.toISOString().split('T')[0];
      const condition = pickCondition(cur);
      const createdAt = atFiveUTC(iso);

      const entity = weatherRepo.create({
        date: iso as any,
        locationName: LOCATION_NAME,
        locationCode: ADM4_CODE,
        weatherJson: {
          condition,
          description: condition,
          source: 'mock-bmkg-like',
          location: { code: ADM4_CODE, name: LOCATION_NAME },
          date: iso,
        },
        createdAt: createdAt as any,
        updatedAt: createdAt as any,
      });
      batch.push(entity);
      cur = new Date(cur.getTime() + ONE_DAY_MS);
    }

    if (batch.length) {
      await weatherRepo
        .createQueryBuilder()
        .insert()
        .values(batch)
        .orUpdate(
          ['weather_json', 'location_name', 'location_code', 'created_at', 'updated_at'],
          ['date', 'location_code'],
        )
        .execute();
    }

    await productionRepo.query(
      `
      UPDATE productions p
      SET weather_id = w.id
      FROM weathers w
      WHERE p.date = w.date
        AND p.weather_id IS NULL;
      `,
    );

    console.log('✅ seed-weather-mock completed');
  } catch (err) {
    console.error('❌ seed-weather-mock failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap();
