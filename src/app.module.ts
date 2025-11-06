import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { envValidationSchema } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return {
          ...config,
          // synchronize should always be false in production
          // Use migrations instead
          synchronize: false,
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000, // Convert to milliseconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
      },
    ]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
