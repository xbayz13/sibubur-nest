import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/entities/role.entity';
import { Product } from '../src/entities/product.entity';
import { ProductCategory } from '../src/entities/product-category.entity';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testRole: Role;
  let testCategory: ProductCategory;
  let createdProductId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test role
    const roleRepository = dataSource.getRepository(Role);
    testRole = await roleRepository.findOne({ where: { name: 'Test Role' } });
    if (!testRole) {
      testRole = roleRepository.create({ name: 'Test Role' });
      testRole = await roleRepository.save(testRole);
    }

    // Create test category
    const categoryRepository = dataSource.getRepository(ProductCategory);
    testCategory = await categoryRepository.findOne({
      where: { name: 'Test Category' },
    });
    if (!testCategory) {
      testCategory = categoryRepository.create({ name: 'Test Category' });
      testCategory = await categoryRepository.save(testCategory);
    }

    // Get auth token
    const userRepository = dataSource.getRepository(User);
    const testUser = await userRepository.findOne({
      where: { username: 'testuser' },
    });
    if (!testUser) {
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          username: 'testuser',
          password: 'password123',
          name: 'Test User',
          roleId: testRole.id,
        });
      authToken = signupResponse.body.access_token;
    } else {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });
      authToken = loginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    // Clean up
    if (createdProductId) {
      const productRepository = dataSource.getRepository(Product);
      await productRepository.delete({ id: createdProductId });
    }
    await app.close();
  });

  describe('POST /products', () => {
    it('should create a new product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product E2E',
          price: 15000,
          productCategoryId: testCategory.id,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Test Product E2E');
          expect(res.body).toHaveProperty('price', 15000);
          createdProductId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Test Product',
          price: 15000,
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
          price: -100,
        })
        .expect(400);
    });
  });

  describe('GET /products', () => {
    it('should return array of products', () => {
      return request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', () => {
      return request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdProductId);
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product', () => {
      return request(app.getHttpServer())
        .patch(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Product Name',
          price: 20000,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', 'Updated Product Name');
          expect(res.body).toHaveProperty('price', 20000);
        });
    });
  });

  describe('DELETE /products/:id', () => {
    it('should soft delete a product', () => {
      return request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

