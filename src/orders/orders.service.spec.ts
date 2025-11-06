import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Product } from '../entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let productRepository: Repository<Product>;
  let dataSource: DataSource;

  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockProductRepository = {
    findOne: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(OrderItemAddon),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('should generate a valid order number', async () => {
      const orderNumber = await service.generateOrderNumber();

      expect(orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'ORD-20240101-0001', status: OrderStatus.OPEN },
        { id: 2, orderNumber: 'ORD-20240101-0002', status: OrderStatus.PAID },
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findAll();

      expect(mockOrderRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });

    it('should filter by storeId if provided', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'ORD-20240101-0001', storeId: 1 },
      ];

      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findAll(1);

      expect(mockOrderRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        status: OrderStatus.OPEN,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne(1);

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: expect.any(Array),
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel an order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        status: OrderStatus.OPEN,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELED,
      });

      const result = await service.cancel(1);

      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should throw BadRequestException if order is already paid', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        status: OrderStatus.PAID,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark an order as paid', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        status: OrderStatus.OPEN,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      const result = await service.markAsPaid(1);

      expect(result.status).toBe(OrderStatus.PAID);
    });
  });
});

