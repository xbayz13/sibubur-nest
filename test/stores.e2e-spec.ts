import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/entities/role.entity';
import { Store } from '../src/entities/store.entity';

describe('Stores (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testRole: Role;
  let testUser: User;
  let createdStoreId: number;

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

    // Create test user and get token
    const userRepository = dataSource.getRepository(User);
    testUser = await userRepository.findOne({ where: { username: 'testuser' } });
    if (!testUser) {
      // Signup to get token
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
      // Login to get token
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
    if (createdStoreId) {
      const storeRepository = dataSource.getRepository(Store);
      await storeRepository.delete({ id: createdStoreId });
    }
    await app.close();
  });

  describe('POST /stores', () => {
    it('should create a new store', () => {
      return request(app.getHttpServer())
        .post('/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Store E2E',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Test Store E2E');
          expect(res.body).toHaveProperty('createdAt');
          createdStoreId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/stores')
        .send({
          name: 'Test Store',
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
        })
        .expect(400);
    });
  });

  describe('GET /stores', () => {
    it('should return array of stores', () => {
      return request(app.getHttpServer())
        .get('/stores')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/stores')
        .expect(401);
    });
  });

  describe('GET /stores/:id', () => {
    it('should return a store by id', () => {
      return request(app.getHttpServer())
        .get(`/stores/${createdStoreId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdStoreId);
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 for non-existent store', () => {
      return request(app.getHttpServer())
        .get('/stores/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /stores/:id', () => {
    it('should update a store', () => {
      return request(app.getHttpServer())
        .patch(`/stores/${createdStoreId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Store Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', 'Updated Store Name');
        });
    });
  });

  describe('DELETE /stores/:id', () => {
    it('should soft delete a store', () => {
      return request(app.getHttpServer())
        .delete(`/stores/${createdStoreId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/stores/${createdStoreId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

