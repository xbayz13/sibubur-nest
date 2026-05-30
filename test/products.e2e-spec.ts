import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/entities/role.entity';
import { Product } from '../src/entities/product.entity';
import { ProductCategory } from '../src/entities/product-category.entity';
import { ProductAddon } from '../src/entities/product-addon.entity';
import { ProductAddonProduct } from '../src/entities/product-addon-product.entity';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testRole: Role;
  let testCategory: ProductCategory;
  let createdProductId: number;
  let createdAddonId: number;

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
      const productAddonProductRepository = dataSource.getRepository(ProductAddonProduct);
      await productAddonProductRepository.delete({ productId: createdProductId });
      
      const productRepository = dataSource.getRepository(Product);
      await productRepository.delete({ id: createdProductId });
    }
    if (createdAddonId) {
      const addonRepository = dataSource.getRepository(ProductAddon);
      await addonRepository.delete({ id: createdAddonId });
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
    it('should return paginated products payload', () => {
      return request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
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

  describe('POST /products/:id/addons', () => {
    beforeAll(async () => {
      // Create a test addon
      const addonResponse = await request(app.getHttpServer())
        .post('/product-addons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Addon E2E',
          price: 2000,
        });
      createdAddonId = addonResponse.body.id;
    });

    it('should add an addon to a product', () => {
      return request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addonId: createdAddonId,
          addonPriceOverride: 2500,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdProductId);
          expect(res.body).toHaveProperty('productAddons');
          expect(Array.isArray(res.body.productAddons)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .send({
          addonId: createdAddonId,
        })
        .expect(401);
    });

    it('should fail with invalid addon ID', () => {
      return request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addonId: 99999,
        })
        .expect(404);
    });

    it('should fail when adding duplicate addon', async () => {
      // First add
      await request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addonId: createdAddonId,
        });

      // Try to add again (should fail)
      return request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addonId: createdAddonId,
        })
        .expect(409);
    });
  });

  describe('DELETE /products/:id/addons/:addonId', () => {
    it('should remove an addon from a product', async () => {
      // Ensure addon is attached before removal
      await request(app.getHttpServer())
        .post(`/products/${createdProductId}/addons`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addonId: createdAddonId });

      return request(app.getHttpServer())
        .delete(`/products/${createdProductId}/addons/${createdAddonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdProductId);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/products/${createdProductId}/addons/${createdAddonId}`)
        .expect(401);
    });

    it('should fail when addon is not assigned to product', () => {
      return request(app.getHttpServer())
        .delete(`/products/${createdProductId}/addons/${createdAddonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
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
