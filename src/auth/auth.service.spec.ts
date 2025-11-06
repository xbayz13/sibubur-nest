import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user and return access token', async () => {
      const username = 'testuser';
      const password = 'password123';
      const name = 'Test User';
      const roleId = 1;

      const mockUser = {
        id: 1,
        username,
        passwordHash: 'hashedPassword',
        name,
        roleId,
      };

      const mockToken = 'mock-access-token';

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.signup(username, password, name, roleId);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username,
        passwordHash: 'hashedPassword',
        name,
        roleId,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ access_token: mockToken });
    });

    it('should throw ConflictException if username already exists', async () => {
      const username = 'existinguser';
      const password = 'password123';
      const name = 'Test User';
      const roleId = 1;

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({});
      mockUserRepository.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.signup(username, password, name, roleId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      const username = 'testuser';
      const password = 'password123';
      const name = 'Test User';
      const roleId = 1;

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.create.mockReturnValue({});
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.signup(username, password, name, roleId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('login', () => {
    it('should return access token for user', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        roleId: 1,
      } as User;

      const mockToken = 'mock-access-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser.id,
        roleId: mockUser.roleId,
      });
      expect(result).toEqual({ access_token: mockToken });
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const username = 'testuser';
      const password = 'password123';
      const mockUser = {
        id: 1,
        username,
        passwordHash: 'hashedPassword',
        roleId: 1,
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(username, password);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username },
        relations: ['role'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.passwordHash);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const username = 'nonexistent';
      const password = 'password123';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const mockUser = {
        id: 1,
        username,
        passwordHash: 'hashedPassword',
        roleId: 1,
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
    });
  });
});

