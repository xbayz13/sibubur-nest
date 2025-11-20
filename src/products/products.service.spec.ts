import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { AddProductAddonDto } from './dto/add-product-addon.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let productAddonProductRepository: Repository<ProductAddonProduct>;
  let productAddonRepository: Repository<ProductAddon>;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockProductAddonProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductAddonRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductAddonProduct),
          useValue: mockProductAddonProductRepository,
        },
        {
          provide: getRepositoryToken(ProductAddon),
          useValue: mockProductAddonRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    productAddonProductRepository = module.get<Repository<ProductAddonProduct>>(
      getRepositoryToken(ProductAddonProduct),
    );
    productAddonRepository = module.get<Repository<ProductAddon>>(
      getRepositoryToken(ProductAddon),
    );
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

      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(mockProductRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(mockProductRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException on error', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Bubur Ayam',
        price: 15000,
      };

      mockProductRepository.create.mockReturnValue({});
      mockProductRepository.save.mockRejectedValue(new Error('Database error'));

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

      mockProductRepository.find.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
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

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

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

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateDto);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith(updatedProduct);
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

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
        relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      });
      expect(mockProductRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('addAddon', () => {
    it('should add an addon to a product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 15000,
        deletedAt: null,
      };
      const mockAddon = {
        id: 1,
        name: 'Test Addon',
        price: 2000,
        deletedAt: null,
      };
      const addAddonDto: AddProductAddonDto = {
        addonId: 1,
        addonPriceOverride: 2500,
      };
      const mockProductAddonProduct = {
        productId: 1,
        addonId: 1,
        addonPriceOverride: 2500,
      };

      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct) // first call in addAddon
        .mockResolvedValueOnce(mockProduct); // second call at the end
      mockProductAddonRepository.findOne.mockResolvedValue(mockAddon);
      mockProductAddonProductRepository.findOne.mockResolvedValue(null);
      mockProductAddonProductRepository.create.mockReturnValue(mockProductAddonProduct);
      mockProductAddonProductRepository.save.mockResolvedValue(mockProductAddonProduct);

      const result = await service.addAddon(1, addAddonDto);

      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockProductAddonRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: IsNull() },
      });
      expect(mockProductAddonProductRepository.findOne).toHaveBeenCalledWith({
        where: { productId: 1, addonId: 1 },
      });
      expect(mockProductAddonProductRepository.create).toHaveBeenCalledWith({
        productId: 1,
        addonId: 1,
        addonPriceOverride: 2500,
      });
      expect(mockProductAddonProductRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      const addAddonDto: AddProductAddonDto = {
        addonId: 1,
      };

      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.addAddon(999, addAddonDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if addon not found', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        deletedAt: null,
      };
      const addAddonDto: AddProductAddonDto = {
        addonId: 999,
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductAddonRepository.findOne.mockResolvedValue(null);

      await expect(service.addAddon(1, addAddonDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if addon already assigned', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        deletedAt: null,
      };
      const mockAddon = {
        id: 1,
        name: 'Test Addon',
        deletedAt: null,
      };
      const addAddonDto: AddProductAddonDto = {
        addonId: 1,
      };
      const existingRelation = {
        productId: 1,
        addonId: 1,
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductAddonRepository.findOne.mockResolvedValue(mockAddon);
      mockProductAddonProductRepository.findOne.mockResolvedValue(existingRelation);

      await expect(service.addAddon(1, addAddonDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeAddon', () => {
    it('should remove an addon from a product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        deletedAt: null,
      };
      const mockProductAddonProduct = {
        productId: 1,
        addonId: 1,
      };

      mockProductRepository.findOne
        .mockResolvedValueOnce(mockProduct) // first call in removeAddon
        .mockResolvedValueOnce(mockProduct); // second call at the end
      mockProductAddonProductRepository.findOne.mockResolvedValue(mockProductAddonProduct);
      mockProductAddonProductRepository.remove.mockResolvedValue(mockProductAddonProduct);

      const result = await service.removeAddon(1, 1);

      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockProductAddonProductRepository.findOne).toHaveBeenCalledWith({
        where: { productId: 1, addonId: 1 },
      });
      expect(mockProductAddonProductRepository.remove).toHaveBeenCalledWith(
        mockProductAddonProduct,
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAddon(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if addon not assigned to product', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        deletedAt: null,
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductAddonProductRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAddon(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});

