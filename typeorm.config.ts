import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { getDatabaseConfig } from './src/config/database.config';

config();

// This file is used by TypeORM CLI for migrations
export default new DataSource(getDatabaseConfig());

