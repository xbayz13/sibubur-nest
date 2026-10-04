import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Order } from '../entities/order.entity';
import { Transaction } from '../entities/transaction.entity';
import { Production } from '../entities/production.entity';
import { Expense } from '../entities/expense.entity';
import { Attendance } from '../entities/attendance.entity';
import { Weather } from '../entities/weather.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ReportsService', () => {
  let service: ReportsService;
  let productionRepository: jest.Mocked<Repository<Production>>;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let weatherRepository: jest.Mocked<Repository<Weather>>;

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };

  const mockProductionRepository = {
    find: jest.fn(),
  };

  const mockOrderRepository = {
    find: jest.fn(),
  };

  const mockWeatherRepository = {
    findOne: jest.fn(),
  };

  const mockTransactionRepository = { find: jest.fn() };
  const mockExpenseRepository = { find: jest.fn() };
  const mockAttendanceRepository = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
        { provide: getRepositoryToken(Production), useValue: mockProductionRepository },
        { provide: getRepositoryToken(Expense), useValue: mockExpenseRepository },
        { provide: getRepositoryToken(Attendance), useValue: mockAttendanceRepository },
        { provide: getRepositoryToken(Weather), useValue: mockWeatherRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    productionRepository = module.get(getRepositoryToken(Production));
    orderRepository = module.get(getRepositoryToken(Order));
    weatherRepository = module.get(getRepositoryToken(Weather));

    jest.clearAllMocks();
  });

  describe('getProductionRecommendations', () => {
    const targetDate = '2026-09-16';

    // Helper: buat mock production entity
    const makeProduction = (
      porridgeAmount: number,
      weatherCondition: string | null,
      dateOffset = 0,
    ): Production => {
      const date = new Date(targetDate);
      date.setDate(date.getDate() - Math.abs(dateOffset));
      return {
        id: 1,
        date: date as any,
        weatherId: weatherCondition ? 1 : null,
        weather: weatherCondition
          ? ({ weatherJson: { condition: weatherCondition } } as any)
          : null,
        storeId: 1,
        store: null,
        porridgeAmount,
        authorId: 1,
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        productionSupplies: [],
      } as Production;
    };

    // Helper: buat mock order entity
    const makeOrder = (quantity: number, dateOffset = 0): Order => {
      const date = new Date(targetDate);
      date.setDate(date.getDate() - Math.abs(dateOffset));
      return {
        id: 1,
        createdAt: date,
        orderItems: [{ quantity } as any],
        storeId: 1,
      } as unknown as Order;
    };

    it('should return data-driven multiplier when weather data is sufficient', async () => {
      // Setup: 10 hari historis, semua hujan, production 40
      // Overall avg = 40, avg for hujan = 40 → multiplier = 1.0
      const productions = Array.from({ length: 10 }, (_, i) =>
        makeProduction(40, 'hujan', -(i + 1)),
      );
      const orders = Array.from({ length: 10 }, (_, i) =>
        makeOrder(35, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'hujan', description: 'Hujan ringan' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      expect(result.weatherMultiplier).toBe(1.0);
      expect(result.recommendedAmount).toBeGreaterThan(0);
    });

    it('should use fallback when no similar weather data exists', async () => {
      // Setup: semua production cerah, tapi target hujan → fallback
      const productions = Array.from({ length: 10 }, (_, i) =>
        makeProduction(40, 'cerah', -(i + 1)),
      );
      const orders = Array.from({ length: 10 }, (_, i) =>
        makeOrder(35, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'hujan', description: 'Hujan' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      // Fallback: hujan → 0.8
      expect(result.weatherMultiplier).toBe(0.8);
    });

    it('should use fallback when historicalProductions is empty', async () => {
      productionRepository.find.mockResolvedValue([]);
      orderRepository.find.mockResolvedValue([]);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'badai', description: 'Badai' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      // Fallback: badai → 0.7
      expect(result.weatherMultiplier).toBe(0.7);
    });

    it('should clamp multiplier to max 1.5', async () => {
      // Setup: cuaca cerah production = 100, overall avg = 50 → multiplier = 2.0
      // Harus di-clamp ke 1.5
      const productions = [
        makeProduction(100, 'cerah', -1),
        makeProduction(100, 'cerah', -2),
        makeProduction(100, 'cerah', -3),
        makeProduction(0, 'hujan', -4), // drag down overall avg
        makeProduction(0, 'hujan', -5),
      ];
      const orders = Array.from({ length: 5 }, (_, i) =>
        makeOrder(30, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'cerah', description: 'Cerah' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      expect(result.weatherMultiplier).toBeLessThanOrEqual(1.5);
    });

    it('should clamp multiplier to min 0.5', async () => {
      // Setup: cuaca hujan production = 10, overall avg = 50 → multiplier = 0.2
      // Harus di-clamp ke 0.5
      const productions = [
        makeProduction(10, 'hujan', -1),
        makeProduction(10, 'hujan', -2),
        makeProduction(10, 'hujan', -3),
        makeProduction(100, 'cerah', -4),
        makeProduction(100, 'cerah', -5),
      ];
      const orders = Array.from({ length: 5 }, (_, i) =>
        makeOrder(30, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'hujan', description: 'Hujan' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      expect(result.weatherMultiplier).toBeGreaterThanOrEqual(0.5);
    });

    it('should return 1.0 multiplier when no weather data for target', async () => {
      productionRepository.find.mockResolvedValue([]);
      orderRepository.find.mockResolvedValue([]);
      weatherRepository.findOne.mockResolvedValue(null);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      expect(result.weatherMultiplier).toBe(1.0);
    });

    it('should match similar weather groups correctly', async () => {
      // 'hujan ringan' dan 'hujan sedang' harus match ke grup yang sama
      const productions = [
        makeProduction(50, 'hujan ringan', -1),
        makeProduction(50, 'hujan sedang', -2),
        makeProduction(50, 'hujan', -3),
      ];
      const orders = Array.from({ length: 3 }, (_, i) =>
        makeOrder(40, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'hujan', description: 'Hujan' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      // Semua production match → data-driven multiplier
      expect(result.weatherMultiplier).not.toBe(0.8); // bukan fallback
      expect(result.weatherMultiplier).toBeGreaterThan(0);
    });

    it('should NOT match hujan lebat to cerah group', async () => {
      // Verifikasi bug fix: hujan lebat hanya di stormyGroup
      const productions = [
        makeProduction(60, 'cerah', -1),
        makeProduction(40, 'hujan lebat', -2),
      ];
      const orders = Array.from({ length: 2 }, (_, i) =>
        makeOrder(35, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'cerah', description: 'Cerah' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      // Hanya 'cerah' yang match → avgProduction = 60
      // Overall avg = (60+40)/2 = 50
      // Multiplier = 60/50 = 1.2
      expect(result.weatherMultiplier).toBe(1.2);
    });

    it('should generate weather recommendation messages', async () => {
      const productions = Array.from({ length: 5 }, (_, i) =>
        makeProduction(60, 'cerah', -(i + 1)),
      );
      const orders = Array.from({ length: 5 }, (_, i) =>
        makeOrder(30, -(i + 1)),
      );

      productionRepository.find.mockResolvedValue(productions);
      orderRepository.find.mockResolvedValue(orders);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition: 'cerah', description: 'Cerah' },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);

      const weatherMsg = result.recommendations.find((r: string) =>
        r.includes('Cuaca hari ini'),
      );
      expect(weatherMsg).toBeDefined();
    });
  });

  describe('getFixedMultiplier (private - tested via behavior)', () => {
    const targetDate = '2026-09-16';

    const makeProduction = (
      porridgeAmount: number,
      weatherCondition: string | null,
      dateOffset = 0,
    ): Production => {
      const date = new Date(targetDate);
      date.setDate(date.getDate() - Math.abs(dateOffset));
      return {
        id: 1,
        date: date as any,
        weatherId: weatherCondition ? 1 : null,
        weather: weatherCondition
          ? ({ weatherJson: { condition: weatherCondition } } as any)
          : null,
        storeId: 1,
        store: null,
        porridgeAmount,
        authorId: 1,
        author: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        productionSupplies: [],
      } as Production;
    };

    const makeOrder = (quantity: number, dateOffset = 0): Order => {
      const date = new Date(targetDate);
      date.setDate(date.getDate() - Math.abs(dateOffset));
      return {
        id: 1,
        createdAt: date,
        orderItems: [{ quantity } as any],
        storeId: 1,
      } as unknown as Order;
    };

    const testFallback = async (condition: string, expected: number) => {
      productionRepository.find.mockResolvedValue([]);
      orderRepository.find.mockResolvedValue([]);
      weatherRepository.findOne.mockResolvedValue({
        id: 1,
        weatherJson: { condition, description: condition },
      } as any);

      const result = await service.getProductionRecommendations(targetDate, 1, 30);
      expect(result.weatherMultiplier).toBe(expected);
    };

    it('should return 0.8 for hujan', async () => {
      await testFallback('hujan', 0.8);
    });

    it('should return 0.7 for badai', async () => {
      await testFallback('badai', 0.7);
    });

    it('should return 1.0 for cerah', async () => {
      await testFallback('cerah', 1.0);
    });

    it('should return 0.9 for mendung', async () => {
      await testFallback('mendung', 0.9);
    });

    it('should return 1.0 for unknown condition', async () => {
      await testFallback('unknown_weather', 1.0);
    });

    it('should return 0.7 for storm', async () => {
      await testFallback('storm', 0.7);
    });

    it('should return 0.9 for cloudy', async () => {
      await testFallback('cloudy', 0.9);
    });
  });
});
