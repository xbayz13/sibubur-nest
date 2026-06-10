import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, DataSource } from 'typeorm';
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
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockProductRepository = {
    find: jest.fn(),
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
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
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
    it('should return paginated orders', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'ORD-20240101-0001', status: OrderStatus.OPEN },
        { id: 2, orderNumber: 'ORD-20240101-0002', status: OrderStatus.PAID },
      ];

      mockOrderRepository.findAndCount.mockResolvedValue([mockOrders, 2]);

      const result = await service.findAll();

      expect(mockOrderRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by storeId if provided', async () => {
      const mockOrders = [
        { id: 1, orderNumber: 'ORD-20240101-0001', storeId: 1 },
      ];

      mockOrderRepository.findAndCount.mockResolvedValue([mockOrders, 1]);

      const result = await service.findAll(1);

      expect(mockOrderRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
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

  describe('create', () => {
    it('should create an order without tax', async () => {
      const createOrderDto: CreateOrderDto = {
        storeId: 1,
        customerName: 'Test Customer',
        items: [
          {
            productId: 1,
            quantity: 2,
          },
        ],
      };

      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 15000,
        deletedAt: null,
      };

      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        ...createOrderDto,
        subtotalAmount: 30000,
        taxAmount: 3000,
        totalAmount: 33000,
        status: OrderStatus.OPEN,
      };

      mockProductRepository.find.mockResolvedValue([mockProduct]);
      mockQueryRunner.manager.create.mockImplementation((entity, dto) => ({ ...dto }));
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce([{ id: 1, orderId: 1, productId: 1, quantity: 2, unitPrice: 15000, lineTotal: 30000 }]);
      // First findOne: collision check in generateOrderNumber (must be null); then findOne(id) returns full order
      mockOrderRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(mockOrder);

      const result = await service.create(createOrderDto, 1);

      expect(mockProductRepository.find).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          subtotalAmount: 30000,
          taxAmount: 3000,
          totalAmount: 33000,
        })
      );
      expect(result).toBeDefined();
      expect(result.subtotalAmount).toBe(30000);
      expect(result.taxAmount).toBe(3000);
      expect(result.totalAmount).toBe(33000);
    });

    it('should create an order with addons without tax', async () => {
      const createOrderDto: CreateOrderDto = {
        storeId: 1,
        customerName: 'Test Customer',
        items: [
          {
            productId: 1,
            quantity: 2,
            addons: [
              {
                addonId: 1,
                price: 2000,
                quantity: 1,
              },
            ],
          },
        ],
      };

      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 15000,
        deletedAt: null,
      };

      const mockOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-0001',
        ...createOrderDto,
        subtotalAmount: 32000,
        taxAmount: 3200,
        totalAmount: 35200,
        status: OrderStatus.OPEN,
      };

      mockProductRepository.find.mockResolvedValue([mockProduct]);
      mockQueryRunner.manager.create.mockImplementation((entity, dto) => ({ ...dto }));
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce([{ id: 1, orderId: 1, productId: 1, quantity: 2, unitPrice: 15000, lineTotal: 32000 }])
        .mockResolvedValueOnce(undefined);
      // First findOne: collision check in generateOrderNumber (must be null); then findOne(id) returns full order
      mockOrderRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(mockOrder);

      const result = await service.create(createOrderDto, 1);

      expect(result).toBeDefined();
      expect(result.subtotalAmount).toBe(32000);
      expect(result.taxAmount).toBe(3200);
      expect(result.totalAmount).toBe(35200);
    });

    it('should throw NotFoundException if product not found', async () => {
      const createOrderDto: CreateOrderDto = {
        storeId: 1,
        items: [
          {
            productId: 999,
            quantity: 1,
          },
        ],
      };

      mockProductRepository.find.mockResolvedValue([]);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if userId is invalid', async () => {
      const createOrderDto: CreateOrderDto = {
        storeId: 1,
        items: [
          {
            productId: 1,
            quantity: 1,
          },
        ],
      };

      await expect(service.create(createOrderDto, 0)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
