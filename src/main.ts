import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for POS frontend interactions
  app.enableCors();

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger setup for API docs
  const config = new DocumentBuilder()
    .setTitle('SiBubur POS API')
    .setDescription('API documentation for SiBubur Point of Sale system')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
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

  await app.listen(3000);
}
bootstrap();
