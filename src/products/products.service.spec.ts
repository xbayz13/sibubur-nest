import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Bubur Ayam',
        price: 15000,
      };
      const mockProduct = {
        id: 1,
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException on error', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Bubur Ayam',
        price: 15000,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createProductDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 10000, deletedAt: null },
        { id: 2, name: 'Product 2', price: 20000, deletedAt: null },
      ];

      mockRepository.find.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { deletedAt: IsNull() },
        relations: ['category', 'picture'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        id: 1,
        name: 'Bubur Ayam',
        price: 15000,
        deletedAt: null,
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Old Product',
        price: 10000,
        deletedAt: null,
      };
      const updateDto = { name: 'New Product', price: 20000 };
      const updatedProduct = { ...mockProduct, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(mockRepository.save).toHaveBeenCalledWith(updatedProduct);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product Test',
        deletedAt: null,
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });
});

