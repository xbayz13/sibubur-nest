import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  // Parse DATABASE_URL if provided
  let config: any;

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    config = {
      type: 'postgres',
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password || '',
      database: url.pathname.slice(1),
    };
  } else if (process.env.DB_TYPE === 'postgres') {
    config = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sibubur',
    };
  } else {
    config = {
      type: 'sqlite',
      database: process.env.DB_PATH || 'sibubur.db',
    };
  }

  const dataSource = new DataSource({
    ...config,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: true,
  });

  try {
    console.log('🔄 Connecting to database...');
    console.log(`📍 Database: ${config.database}`);
    console.log(`🌐 Host: ${config.host || 'SQLite file'}`);
    
    await dataSource.initialize();
    console.log('✅ Database connection successful!');

    // Get all entity metadata
    const entities = dataSource.entityMetadatas;
    console.log(`\n📊 Found ${entities.length} entities:`);
    entities.forEach((entity) => {
      console.log(`   - ${entity.tableName}`);
    });

    // Synchronize schema (create tables)
    console.log('\n🔄 Synchronizing database schema...');
    await dataSource.synchronize();
    console.log('✅ Database schema synchronized successfully!');

    console.log('\n📋 Tables created:');
    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    tables.forEach((table) => {
      console.log(`   - ${table.name}`);
    });
    await queryRunner.release();

    await dataSource.destroy();
    console.log('\n✅ Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error details:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

testConnection();


