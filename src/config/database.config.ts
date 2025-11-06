import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export function getDatabaseConfig(): DataSourceOptions {
  let dbConfig: any;

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password || '',
      database: url.pathname.slice(1),
    };
  } else if (process.env.DB_TYPE === 'postgres') {
    dbConfig = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sibubur',
    };
  } else {
    dbConfig = {
      type: 'sqlite',
      database: process.env.DB_PATH || 'sibubur.db',
    };
  }

  return {
    ...dbConfig,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false, // Always false in production - use migrations
    logging: process.env.NODE_ENV === 'development',
  };
}

// For TypeORM CLI
export default new DataSource(getDatabaseConfig());

