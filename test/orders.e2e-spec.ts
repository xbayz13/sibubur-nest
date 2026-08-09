import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { DataSource, In } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/entities/role.entity';
import { Store } from '../src/entities/store.entity';
import { Product } from '../src/entities/product.entity';
import { ProductCategory } from '../src/entities/product-category.entity';
import { Order } from '../src/entities/order.entity';
import { OrderItem } from '../src/entities/order-item.entity';
import { OrderItemAddon } from '../src/entities/order-item-addon.entity';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testRole: Role;
  let testStore: Store;
  let testProduct: Product;
  let testCategory: ProductCategory;
  let createdOrderId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test role (SuperAdmin bypasses permission checks)
    const roleRepository = dataSource.getRepository(Role);
    testRole = await roleRepository.findOne({ where: { name: 'SuperAdmin' } });
    if (!testRole) {
      testRole = roleRepository.create({ name: 'SuperAdmin' });
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

    // Create test store
    const storeRepository = dataSource.getRepository(Store);
    testStore = await storeRepository.findOne({
      where: { name: 'Test Store' },
    });
    if (!testStore) {
      testStore = storeRepository.create({ name: 'Test Store' });
      testStore = await storeRepository.save(testStore);
    }

    // Create test product
    const productRepository = dataSource.getRepository(Product);
    testProduct = await productRepository.findOne({
      where: { name: 'Test Product' },
    });
    if (!testProduct) {
      testProduct = productRepository.create({
        name: 'Test Product',
        price: 15000,
        productCategoryId: testCategory.id,
      });
      testProduct = await productRepository.save(testProduct);
    }

    // Get auth token
    const userRepository = dataSource.getRepository(User);
    const testUser = await userRepository.findOne({
      where: { username: 'testuser' },
    });
    if (!testUser) {
      await userRepository.save(
        userRepository.create({
          username: 'testuser',
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Test User',
          roleId: testRole.id,
        }),
      );
    }
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
      });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    if (createdOrderId) {
      const orderItemAddonRepository = dataSource.getRepository(OrderItemAddon);
      const orderItemRepository = dataSource.getRepository(OrderItem);
      const orderRepository = dataSource.getRepository(Order);

      const orderItems = await orderItemRepository.find({
        where: { orderId: createdOrderId },
      });
      const orderItemIds = orderItems.map((item) => item.id);

      if (orderItemIds.length > 0) {
        await orderItemAddonRepository.delete({
          orderItemId: In(orderItemIds),
        });
      }
      await orderItemRepository.delete({ orderId: createdOrderId });
      await orderRepository.delete({ id: createdOrderId });
    }
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create a new order', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: testStore.id,
          customerName: 'Test Customer',
          items: [
            {
              productId: testProduct.id,
              quantity: 2,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('orderNumber');
          expect(res.body).toHaveProperty('status', 'open');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('orderItems');
          expect(Array.isArray(res.body.orderItems)).toBe(true);
          createdOrderId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          storeId: testStore.id,
          items: [{ productId: testProduct.id, quantity: 1 }],
        })
        .expect(401);
    });

    it('should fail with invalid product id', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeId: testStore.id,
          items: [{ productId: 99999, quantity: 1 }],
        })
        .expect(404);
    });
  });

  describe('GET /orders', () => {
    it('should return paginated orders payload', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
        });
    });
  });

  describe('GET /orders/:id', () => {
    it('should return an order by id', () => {
      return request(app.getHttpServer())
        .get(`/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdOrderId);
          expect(res.body).toHaveProperty('orderNumber');
        });
    });
  });

  describe('PATCH /orders/:id/cancel', () => {
    it('should cancel an order', () => {
      return request(app.getHttpServer())
        .patch(`/orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'canceled');
        });
    });
  });
});
