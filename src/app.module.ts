import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { StoresModule } from './stores/stores.module';
import { TransactionsModule } from './transactions/transactions.module';
import { EmployeesModule } from './employees/employees.module';
import { SuppliesModule } from './supplies/supplies.module';
import { ExpensesModule } from './expenses/expenses.module';
import { WeatherModule } from './weather/weather.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        // Parse DATABASE_URL if provided, otherwise use individual variables
        let dbConfig: any;

        if (process.env.DATABASE_URL) {
          // Parse PostgreSQL URL: postgresql://user:password@host:port/database
          const url = new URL(process.env.DATABASE_URL);
          dbConfig = {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port || '5432'),
            username: url.username,
            password: url.password || '',
            database: url.pathname.slice(1), // Remove leading /
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
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production', // Auto-sync schema in dev (disable in prod)
          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),
    AuthModule,
    RolesModule,
    PermissionsModule,
    RolePermissionsModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    TransactionsModule,
    EmployeesModule,
    SuppliesModule,
    ExpensesModule,
    WeatherModule,
    ReportsModule,
    MediaModule,
  ],
})
export class AppModule {}
