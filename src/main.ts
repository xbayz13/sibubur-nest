import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for POS frontend interactions
  // In production, CORS_ORIGIN must be set (validated in env.validation.ts)
  // When origin is '*', credentials must be false per CORS spec (credentials: true cannot be used with origin: '*')
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const isWildcard = corsOrigin === '*';
  const corsOptions = {
    origin: isWildcard ? '*' : corsOrigin.split(',').map((o) => o.trim()),
    credentials: !isWildcard,
  };
  app.enableCors(corsOptions);

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global validation pipe with better error messages
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = Number(process.env.PORT) || 3000;

  // Swagger setup for API docs
  const config = new DocumentBuilder()
    .setTitle('SiBubur POS API')
    .setDescription('API documentation for SiBubur Point of Sale system')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('users')
    .addTag('roles')
    .addTag('permissions')
    .addTag('role-permissions')
    .addTag('stores')
    .addTag('products')
    .addTag('product-categories')
    .addTag('product-addons')
    .addTag('orders')
    .addTag('transactions')
    .addTag('payment-methods')
    .addTag('employees')
    .addTag('attendances')
    .addTag('supplies')
    .addTag('productions')
    .addTag('expenses')
    .addTag('expense-categories')
    .addTag('weather')
    .addTag('reports')
    .addTag('media')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Accessible at /api

  // Only enable Swagger in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger documentation available at http://localhost:${port}/api`);
  }

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
