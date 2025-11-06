# Testing Guide

This document provides information about the test suite for the SiBubur POS Backend API.

## Test Structure

### Unit Tests
Unit tests are located in `src/**/*.spec.ts` files alongside their corresponding service files. They test individual service methods in isolation using mocked dependencies.

### E2E Tests
End-to-end tests are located in the `test/` directory with the pattern `*.e2e-spec.ts`. They test the full application flow including HTTP requests, database operations, and authentication.

## Running Tests

### Run all unit tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:cov
```

### Run E2E tests
```bash
npm run test:e2e
```

## Test Coverage

### Unit Tests Coverage

The following services have comprehensive unit tests:

1. **AuthService** (`src/auth/auth.service.spec.ts`)
   - User signup with password hashing
   - User login and JWT token generation
   - User validation with credentials
   - Error handling for duplicate usernames
   - Error handling for invalid credentials

2. **StoresService** (`src/stores/stores.service.spec.ts`)
   - Create store
   - Find all stores
   - Find store by ID
   - Update store
   - Soft delete store
   - Error handling for duplicate names
   - Error handling for not found

3. **ProductsService** (`src/products/products.service.spec.ts`)
   - Create product
   - Find all products
   - Find product by ID
   - Update product
   - Soft delete product
   - Error handling

4. **OrdersService** (`src/orders/orders.service.spec.ts`)
   - Generate order number
   - Find all orders
   - Find order by ID
   - Cancel order
   - Mark order as paid
   - Error handling

### E2E Tests Coverage

The following API endpoints have E2E tests:

1. **Auth Endpoints** (`test/auth.e2e-spec.ts`)
   - `POST /auth/signup` - User registration
   - `POST /auth/login` - User authentication
   - `POST /auth/profile` - Get user profile (protected)

2. **Stores Endpoints** (`test/stores.e2e-spec.ts`)
   - `POST /stores` - Create store (protected)
   - `GET /stores` - Get all stores (protected)
   - `GET /stores/:id` - Get store by ID (protected)
   - `PATCH /stores/:id` - Update store (protected)
   - `DELETE /stores/:id` - Delete store (protected)

3. **Products Endpoints** (`test/products.e2e-spec.ts`)
   - `POST /products` - Create product (protected)
   - `GET /products` - Get all products (protected)
   - `GET /products/:id` - Get product by ID (protected)
   - `PATCH /products/:id` - Update product (protected)
   - `DELETE /products/:id` - Delete product (protected)

4. **Orders Endpoints** (`test/orders.e2e-spec.ts`)
   - `POST /orders` - Create order (protected)
   - `GET /orders` - Get all orders (protected)
   - `GET /orders/:id` - Get order by ID (protected)
   - `PATCH /orders/:id/cancel` - Cancel order (protected)

## Test Configuration

### Unit Tests
- Configuration: `package.json` (jest section)
- Test files: `src/**/*.spec.ts`
- Environment: Node.js

### E2E Tests
- Configuration: `test/jest-e2e.json`
- Test files: `test/**/*.e2e-spec.ts`
- Setup file: `test/setup-e2e.ts`
- Environment: Uses in-memory SQLite database for testing

## Writing New Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;
  let repository: Repository<YourEntity>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: getRepositoryToken(YourEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should do something', async () => {
    // Arrange
    mockRepository.findOne.mockResolvedValue({ id: 1 });

    // Act
    const result = await service.findOne(1);

    // Assert
    expect(result).toEqual({ id: 1 });
  });
});
```

### E2E Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('YourModule (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Get auth token for protected routes
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a resource', () => {
    return request(app.getHttpServer())
      .post('/your-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test' })
      .expect(201);
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Use mocks for external dependencies (database, external APIs)
3. **Cleanup**: Always clean up test data in `afterAll` hooks
4. **Naming**: Use descriptive test names that explain what is being tested
5. **AAA Pattern**: Arrange, Act, Assert - structure your tests clearly
6. **Coverage**: Aim for high coverage of business logic, especially error cases

## Continuous Integration

Tests should be run automatically in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Run E2E tests
  run: npm run test:e2e

- name: Generate coverage
  run: npm run test:cov
```

## Troubleshooting

### Tests failing with database errors
- Ensure test database is properly configured
- Check that test data is cleaned up properly
- Verify database migrations are applied

### Authentication issues in E2E tests
- Ensure JWT_SECRET is set in test environment
- Verify test user exists or is created in beforeAll
- Check that tokens are properly set in request headers

### Mock issues in unit tests
- Ensure all dependencies are properly mocked
- Check that mock return values match expected types
- Verify mock functions are reset in afterEach

