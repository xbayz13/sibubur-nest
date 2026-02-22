import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { StoresService } from './stores.service';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';

describe('StoresService', () => {
  let service: StoresService;
  let repository: Repository<Store>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    repository = module.get<Repository<Store>>(getRepositoryToken(Store));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new store', async () => {
      const createStoreDto: CreateStoreDto = { name: 'Store Test' };
      const mockStore = {
        id: 1,
        ...createStoreDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockStore);
      mockRepository.save.mockResolvedValue(mockStore);

      const result = await service.create(createStoreDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createStoreDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockStore);
      expect(result).toEqual(mockStore);
    });

    it('should throw ConflictException if store name already exists', async () => {
      const createStoreDto: CreateStoreDto = { name: 'Existing Store' };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(createStoreDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated stores', async () => {
      const mockStores = [
        { id: 1, name: 'Store 1', deletedAt: null },
        { id: 2, name: 'Store 2', deletedAt: null },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockStores, 2]);

      const result = await service.findAll();

      expect(mockRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(mockStores);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a store by id', async () => {
      const mockStore = {
        id: 1,
        name: 'Store Test',
        deletedAt: null,
      };

      mockRepository.findOne.mockResolvedValue(mockStore);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
      });
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException if store not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a store', async () => {
      const mockStore = {
        id: 1,
        name: 'Old Name',
        deletedAt: null,
      };
      const updateDto = { name: 'New Name' };
      const updatedStore = { ...mockStore, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockStore);
      mockRepository.save.mockResolvedValue(updatedStore);

      const result = await service.update(1, updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(updatedStore);
      expect(result).toEqual(updatedStore);
    });
  });

  describe('remove', () => {
    it('should soft delete a store', async () => {
      const mockStore = {
        id: 1,
        name: 'Store Test',
        deletedAt: null,
      };

      mockRepository.findOne.mockResolvedValue(mockStore);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });
});

