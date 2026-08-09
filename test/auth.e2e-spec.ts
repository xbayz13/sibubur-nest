import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/user.entity';
import { Role } from '../src/entities/role.entity';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testRole: Role;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create a test role if it doesn't exist (SuperAdmin bypasses permission checks)
    const roleRepository = dataSource.getRepository(Role);
    testRole = await roleRepository.findOne({ where: { name: 'SuperAdmin' } });
    if (!testRole) {
      testRole = roleRepository.create({ name: 'SuperAdmin' });
      testRole = await roleRepository.save(testRole);
    }

    // Create the test user directly (signup endpoint was removed)
    const userRepository = dataSource.getRepository(User);
    const existing = await userRepository.findOne({
      where: { username: 'testuser' },
    });
    if (!existing) {
      await userRepository.save(
        userRepository.create({
          username: 'testuser',
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Test User',
          roleId: testRole.id,
        }),
      );
    }

    // Get an auth token for profile tests
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    const userRepository = dataSource.getRepository(User);
    await userRepository.delete({ username: 'testuser' });
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should return 404 (endpoint removed)', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          username: 'anotheruser',
          password: 'password123',
          name: 'Another User',
          roleId: testRole.id,
        })
        .expect(404);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(typeof res.body.access_token).toBe('string');
        });
    });

    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('username');
          expect(res.body).toHaveProperty('roleName');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
